(function () {
    'use strict';
function qaqShuffle(array) {
        var arr = array.slice();
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
        return arr;
    }
    // ===== 跨模块 DOM / 变量兜底 =====
    var modalTitle = window.qaqModalTitle || document.getElementById('qaq-modal-title');
    var modalBody = window.qaqModalBody || document.getElementById('qaq-modal-body');
    var modalBtns = window.qaqModalBtns || document.getElementById('qaq-modal-btns');
    
    // 独立通用日期函数处理
    var qaqFormatDateTime = window.qaqFormatDateTime || function (ts) {
        var d = new Date(ts);
        var y = d.getFullYear();
        var m = d.getMonth() + 1;
        var day = d.getDate();
        var h = d.getHours();
        var min = d.getMinutes();
        return y + '-' +
            (m < 10 ? '0' : '') + m + '-' +
            (day < 10 ? '0' : '') + day + ' ' +
            (h < 10 ? '0' : '') + h + ':' +
            (min < 10 ? '0' : '') + min;
    };

    /* ===== 小说生成/渲染核心区块 ===== */
    var qaqReviewStoryPage = document.getElementById('qaq-review-story-page');
    var qaqReviewStoryAbortCtrl = null;
    var qaqReviewStoryGenerating = false;

    function qaqGetLastReviewStory() {
        return qaqCacheGet('qaq-review-story-last', null);
    }

    function qaqSaveLastReviewStory(data) {
        qaqCacheSet('qaq-review-story-last', data || null);
    }

    function qaqGetReviewStoryHistory() {
        return qaqCacheGet('qaq-review-story-history', []);
    }

    function qaqSaveReviewStoryHistory(list) {
        qaqCacheSet('qaq-review-story-history', list || []);
    }

    function qaqPushReviewStoryHistory(item) {
        var list = qaqGetReviewStoryHistory();
        list.unshift(item);
        if (list.length > 30) list = list.slice(0, 30);
        qaqSaveReviewStoryHistory(list);
    }

    var qaqReviewBuiltInTagGroups = {
        '场景类': ['校园', '日常', '都市', '乡村', '古堡', '海边', '森林', '异世界'],
        '风格类': ['治愈', '黑暗', '温柔', '幽默', '诗意', '紧张', '轻松', '热血'],
        '情绪类': ['青春', '孤独', '成长', '希望', '友情', '恋爱', '遗憾', '勇气'],
        '题材类': ['奇幻', '悬疑', '推理', '冒险', '科幻', '古风', '战争', '童话', '魔法']
    };

    function qaqGetAllBuiltInStoryTags() {
        var out = [];
        Object.keys(qaqReviewBuiltInTagGroups).forEach(function (groupName) {
            out = out.concat(qaqReviewBuiltInTagGroups[groupName] || []);
        });
        return out;
    }

    var qaqReviewStorySelectedTags = [];

    function qaqGetReviewStoryCustomTags() {
        return qaqCacheGet('qaq-review-story-custom-tags', []);
    }

    function qaqSaveReviewStoryCustomTags(tags) {
        qaqCacheSet('qaq-review-story-custom-tags', tags || []);
    }

    var qaqReviewStoryCustomTags = qaqGetReviewStoryCustomTags();

    function qaqGetReviewStorySourceWords() {
        var finished = qaqGetLastFinishedReview();
        if (!finished || !finished.words) return [];
        return finished.words.slice();
    }

    function qaqRenderReviewStoryPage() {
        var words = qaqGetReviewStorySourceWords();
        var wordlistEl = document.getElementById('qaq-review-story-wordlist');
        var settings = qaqGetReviewSettings();
        var lastStory = qaqGetLastReviewStory();

        wordlistEl.innerHTML = '';

        words.forEach(function (item) {
            var chip = document.createElement('div');
            chip.className = 'qaq-review-story-chip';
            chip.textContent = item.word;
            wordlistEl.appendChild(chip);
        });

        document.getElementById('qaq-review-story-word-count').value = settings.storyWordCount || 800;
        document.getElementById('qaq-review-story-mode').value = settings.storyMode || 'story';
        document.getElementById('qaq-review-story-bilingual-mode').value = settings.storyBilingualMode || 'summary-cn';

        if (lastStory && lastStory.tags && lastStory.tags.length) {
            qaqReviewStorySelectedTags = lastStory.tags.slice();
        }

        qaqRenderReviewStoryTags('');
        qaqReviewStoryTranslateMode = false;
        document.getElementById('qaq-review-story-output').classList.remove('qaq-review-story-translate-on');
        document.getElementById('qaq-review-story-translate-toggle-btn').textContent = '逐句翻译';

        if (lastStory && lastStory.paragraphs && lastStory.paragraphs.length) {
            qaqRenderStructuredStory(lastStory);
        } else if (lastStory && lastStory.content) {
            document.getElementById('qaq-review-story-title').textContent = lastStory.title || '生成结果';
            document.getElementById('qaq-review-story-title').style.display = '';
            document.getElementById('qaq-review-story-output').textContent = lastStory.content;
        } else {
            document.getElementById('qaq-review-story-title').style.display = 'none';
            document.getElementById('qaq-review-story-output').textContent = '生成后会显示在这里';
            document.getElementById('qaq-review-story-meta').textContent = '暂无结果';
        }
        qaqWrapSelectAsModal('qaq-review-story-mode', '选择生成模式');
        qaqWrapSelectAsModal('qaq-review-story-bilingual-mode', '选择双语模式');
    }

    function qaqWrapSelectAsModal(selectId, title) {
    var sel = document.getElementById(selectId);
    if (!sel || sel.dataset.wrapped) return;
    sel.dataset.wrapped = '1';

    sel.style.display = 'none';

    var btn = document.createElement('div');
    btn.className = 'qaq-custom-select-btn';
    btn.id = selectId + '-btn';

    function updateBtnText() {
        var opt = sel.options[sel.selectedIndex];
        btn.textContent = opt ? opt.textContent : '请选择';
    }
    updateBtnText();
    
    // 挂载到DOM元素上方便外部随时触发刷新
    sel._updateBtnText = updateBtnText;

    sel.parentNode.insertBefore(btn, sel.nextSibling);

    btn.addEventListener('click', function () {
        var options = [];
        for (var i = 0; i < sel.options.length; i++) {
            options.push({
                value: sel.options[i].value,
                label: sel.options[i].textContent,
                selected: sel.options[i].selected
            });
        }

        modalTitle.textContent = title;
        modalBody.innerHTML = '<div class="qaq-custom-select-list">' +
            options.map(function (opt) {
                return '<div class="qaq-custom-select-option' +
                    (opt.selected ? ' qaq-custom-select-active' : '') +
                    '" data-value="' + opt.value + '">' +
                    '<span>' + opt.label + '</span>' +
                    (opt.selected ? '<span style="color:#c47068;">✓</span>' : '') +
                    '</div>';
            }).join('') +
            '</div>';

        modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';
        qaqOpenModal();
        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

        modalBody.querySelectorAll('.qaq-custom-select-option').forEach(function (item) {
            item.addEventListener('click', function () {
                sel.value = this.dataset.value;
                updateBtnText();
                
                // 【关键修复】：派发原生 change 事件，触发后续联动代码！
                var evt = document.createEvent('HTMLEvents');
                evt.initEvent('change', false, true);
                sel.dispatchEvent(evt);
                    
                qaqCloseModal();
            });
        });
    });
}

    var qaqReviewStoryTranslateMode = false;

    function qaqGetReviewStoryFavorites() {
        return qaqCacheGet('qaq-review-story-favorites', []);
    }

    function qaqSaveReviewStoryFavorites(list) {
        qaqCacheSet('qaq-review-story-favorites', list || []);
    }

    function qaqToggleStoryFavorite(story) {
        var list = qaqGetReviewStoryFavorites();
        var idx = list.findIndex(function (item) {
            return item.createdAt === story.createdAt;
        });

        if (idx > -1) {
            list.splice(idx, 1);
            qaqSaveReviewStoryFavorites(list);
            return false;
        } else {
            list.unshift(story);
            if (list.length > 100) list = list.slice(0, 100);
            qaqSaveReviewStoryFavorites(list);
            return true;
        }
    }

    function qaqGenerateStoryTitle(storyText, tags, words, mode) {
        var map = {
            story: '单词短篇故事',
            dialogue: '单词情景对话',
            diary: '单词学习日记',
            essay: '单词主题短文',
            cet: '四六级风格作文'
        };

        var base = map[mode] || '单词生成作品';
        var useTag = tags && tags.length ? tags[0] : '';
        var useWord = words && words.length ? words[0] : '';

        if (useTag && useWord) return useTag + ' · ' + useWord + ' · ' + base;
        if (useTag) return useTag + ' · ' + base;
        if (useWord) return useWord + ' · ' + base;
        return base;
    }

    function qaqNormalizeWordToken(token) {
        return String(token || '').toLowerCase().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
    }

    function qaqFindWordInfo(rawWord, sourceWords) {
        var key = String(rawWord || '').toLowerCase().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');

        var exact = (sourceWords || []).find(function (item) {
            return String(item.word || '').toLowerCase() === key;
        });
        if (exact) return exact;

        var fuzzy = (sourceWords || []).find(function (item) {
            var w = String(item.word || '').toLowerCase();
            return key === w ||
                   key === w + 's' ||
                   key === w + 'ed' ||
                   key === w + 'ing' ||
                   key === w.replace(/y$/, 'ies');
        });

        return fuzzy || null;
    }

    function qaqRenderSentenceWords(sentence, sourceWords) {
        return String(sentence || '').replace(/\b([A-Za-z][A-Za-z'-]*)\b/g, function (m, raw) {
            return '<span class="qaq-review-story-word" data-word="' + qaqEscapeHtml(raw) + '">' + raw + '</span>';
        });
    }

    function qaqRenderStructuredStory(storyData) {
        var outputEl = document.getElementById('qaq-review-story-output');
        var titleEl = document.getElementById('qaq-review-story-title');
        if (!outputEl || !titleEl) return;
        if (!storyData.sourceWords || !storyData.sourceWords.length) {
            storyData.sourceWords = qaqGetReviewStorySourceWords();
        }
        if (!storyData || !storyData.paragraphs || !storyData.paragraphs.length) {
            titleEl.style.display = 'none';
            outputEl.textContent = '生成后会显示在这里';
            return;
        }

        titleEl.textContent = storyData.title || '生成结果';
        titleEl.style.display = '';
        outputEl.classList.toggle('qaq-review-story-translate-on', !!qaqReviewStoryTranslateMode);

        outputEl.innerHTML = storyData.paragraphs.map(function (para, pIndex) {
            var sentenceHtml = (para.sentences || []).map(function (sentence, sIndex) {
                return (
                    '<div class="qaq-review-story-sentence-wrap">' +
                        '<div class="qaq-review-story-sentence" data-paragraph="' + pIndex + '" data-sentence="' + sIndex + '">' +
                            qaqRenderSentenceWords(sentence.en || '', storyData.sourceWords || []) +
                        '</div>' +
                        '<div class="qaq-review-story-sentence-cn">' + qaqEscapeHtml(sentence.cn || '') + '</div>' +
                    '</div>'
                );
            }).join('');

            return (
                '<div class="qaq-review-story-paragraph" data-paragraph="' + pIndex + '">' +
                    sentenceHtml +
                '</div>'
            );
        }).join('');
    }

    function qaqSpeakWord(text) {
    if (!text) return;
    var settings = qaqGetReviewSettings();
    if (settings.mmVoice && (settings.apiKey || settings.minimaxGroupId)) {
        qaqSpeakMiniMax(text, settings);
        return;
    }
    qaqSpeakNative(text, settings);
}

function qaqSpeakText(text) {
    qaqSpeakWord(text); // 统一路由
}

function qaqStopSpeakText() {
    if (window.qaqCurrentAudio) {
        window.qaqCurrentAudio.pause();
        window.qaqCurrentAudio.src = '';
    }
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
}

// MiniMax 原生真人语音核心模块
async function qaqSpeakMiniMax(text, settings) {
    // 提取设置，如果没有单独设置语音 API Key，就降级借用文本生成的 Key
    var apiKey = settings.mmApiKey || settings.apiKey;
    if (!apiKey) {
        qaqToast('请先配置 API Key');
        qaqSpeakNative(text, settings);
        return;
    }
    
    var groupId = settings.minimaxGroupId;
    var voiceId = settings.mmVoiceId || 'female-shaonv';
    var model = settings.mmModel || 'speech-01-turbo';
    var baseUrl = settings.mmRegion || 'https://api.minimax.chat/v1/t2a_v2';
    
    var url = baseUrl;
    if (groupId) url += '?GroupId=' + encodeURIComponent(groupId);
    
    try {
        var response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                text: text,
                stream: false,
                voice_setting: {
                    voice_id: voiceId,
                    speed: settings.speechRate || 1,
                    vol: 1,
                    pitch: 0
                },
                audio_setting: {
                    sample_rate: 32000,
                    bitrate: 128000,
                    format: 'mp3',
                    channel: 1
                }
            })
        });
        
        if (!response.ok) throw new Error('MiniMax TTS API 异常: ' + response.status);
        var data = await response.json();
        if (data.base_resp && data.base_resp.status_code !== 0) {
            throw new Error(data.base_resp.status_msg);
        }
        
        var hex = data.data && data.data.audio;
        if (!hex) throw new Error('API 返回无声音数据');
        
        // 将十六进制音频转为真正的 MP3 Blob 供网页播放
        var bytes = new Uint8Array(hex.length / 2);
        for (var i = 0; i < hex.length; i += 2) {
            bytes[i/2] = parseInt(hex.substr(i, 2), 16);
        }
        
        var blob = new Blob([bytes], { type: 'audio/mp3' });
        var audioUrl = URL.createObjectURL(blob);
        
        qaqStopSpeakText(); // 停掉并打断之前发音
        
        var audio = new Audio(audioUrl);
        window.qaqCurrentAudio = audio;
        audio.onended = function() { URL.revokeObjectURL(audioUrl); };
        audio.onerror = function() { 
            URL.revokeObjectURL(audioUrl); 
            qaqSpeakNative(text, settings); 
        };
        
        audio.play().catch(function(e) {
            console.error(e);
            qaqSpeakNative(text, settings);
        });
        
    } catch(err) {
        console.error('MiniMax发音获取失败:', err);
        if (text.length > 2) qaqToast('MiniMax发音连接超时，切换系统音');
        qaqSpeakNative(text, settings);
    }
}

// 以前的系统自带机械音作为后备兜底机制
function qaqSpeakNative(text, settings) {
    if (!('speechSynthesis' in window)) return qaqToast('当前设备不支持朗读');
    var langCfg = window.qaqGetCurrentLangConfig ? window.qaqGetCurrentLangConfig() : { ttsLang: 'en-US' };
    var utter = new SpeechSynthesisUtterance(text);
    utter.lang = langCfg.ttsLang || 'en-US';
    utter.rate = Math.max(0.6, Math.min(1.2, Number(settings.speechRate || 0.9)));
    var voice = qaqPickVoiceForLang(utter.lang);
    if (voice) utter.voice = voice;
    
    qaqStopSpeakText();
    setTimeout(function(){ speechSynthesis.speak(utter); }, 30);
}

    function qaqRenderReviewStoryTags(keyword) {
        var builtinEl = document.getElementById('qaq-review-story-builtin-tags');
        var customEl = document.getElementById('qaq-review-story-custom-tags');
        var customEmptyEl = document.getElementById('qaq-review-story-custom-empty');

        if (!builtinEl || !customEl) return;

        builtinEl.innerHTML = '';
        customEl.innerHTML = '';

        var kw = (keyword || '').trim();
        qaqReviewStoryCustomTags = qaqGetReviewStoryCustomTags();

        function createTagEl(tag, isCustom) {
            var el = document.createElement('div');
            el.className = 'qaq-review-story-tag' +
                (qaqReviewStorySelectedTags.indexOf(tag) > -1 ? ' qaq-tag-active' : '') +
                (isCustom ? ' qaq-tag-custom' : '');
            el.textContent = tag;

            el.addEventListener('click', function (e) {
                if (e.target.closest('.qaq-review-story-tag-del')) return;

                var idx = qaqReviewStorySelectedTags.indexOf(tag);
                if (idx > -1) qaqReviewStorySelectedTags.splice(idx, 1);
                else qaqReviewStorySelectedTags.push(tag);

                qaqRenderReviewStoryTags(document.getElementById('qaq-review-story-tag-search').value);
            });

            if (isCustom) {
                var del = document.createElement('span');
                del.className = 'qaq-review-story-tag-del';
                del.textContent = '×';
                del.title = '删除标签';

                del.addEventListener('click', function (e) {
                    e.stopPropagation();

                    qaqReviewStoryCustomTags = qaqGetReviewStoryCustomTags().filter(function (t) {
                        return t !== tag;
                    });
                    qaqSaveReviewStoryCustomTags(qaqReviewStoryCustomTags);

                    qaqReviewStorySelectedTags = qaqReviewStorySelectedTags.filter(function (t) {
                        return t !== tag;
                    });

                    qaqRenderReviewStoryTags(document.getElementById('qaq-review-story-tag-search').value);
                    qaqToast('已删除自定义标签');
                });

                el.appendChild(del);
            }

            return el;
        }

        var builtinCount = 0;

        Object.keys(qaqReviewBuiltInTagGroups).forEach(function (groupName) {
            var tags = (qaqReviewBuiltInTagGroups[groupName] || []).filter(function (tag) {
                return !kw || tag.indexOf(kw) > -1;
            });

            if (!tags.length) return;

            builtinCount += tags.length;

            var groupWrap = document.createElement('div');
            groupWrap.className = 'qaq-review-story-tag-group';

            var title = document.createElement('div');
            title.className = 'qaq-review-story-tag-group-title';
            title.textContent = groupName + '（' + tags.length + '）';

            var body = document.createElement('div');
            body.className = 'qaq-review-story-tags';

            tags.forEach(function (tag) {
                body.appendChild(createTagEl(tag, false));
            });

            groupWrap.appendChild(title);
            groupWrap.appendChild(body);
            builtinEl.appendChild(groupWrap);
        });

        var customFiltered = qaqReviewStoryCustomTags.filter(function (tag) {
            return !kw || tag.indexOf(kw) > -1;
        });

        customFiltered.forEach(function (tag) {
            customEl.appendChild(createTagEl(tag, true));
        });

        customEmptyEl.style.display = customFiltered.length ? 'none' : '';

        document.getElementById('qaq-review-story-builtin-count').textContent = builtinCount;
        document.getElementById('qaq-review-story-custom-count').textContent = customFiltered.length;
        document.getElementById('qaq-review-story-tag-stats').textContent =
            '已选 ' + qaqReviewStorySelectedTags.length +
            ' · 内置 ' + builtinCount +
            ' · 自定义 ' + customFiltered.length;
    }

    async function qaqGenerateReviewStory() {
        var cfg = qaqGetReviewApiConfig();
        var words = qaqGetReviewStorySourceWords();
        var settings = qaqGetReviewSettings();

        if (qaqReviewStoryGenerating) {
            return qaqToast('正在生成中');
        }

        if (!words.length) {
            return qaqToast('没有可用于生成小说的本轮单词');
        }

        if (!cfg.key || !cfg.model) {
            return qaqToast('请先在背单词设置中填好 API Key 和 Model');
        }

        if ((cfg.provider === 'openai' || cfg.provider === 'minimax-openai') && !cfg.url) {
            return qaqToast('请先填写兼容接口 URL');
        }

        if (cfg.provider === 'minimax-native' && !cfg.minimaxGroupId && !cfg.url) {
            return qaqToast('MiniMax 原生接口请填写 Group ID，或完整原生 URL');
        }

        var storyMode = document.getElementById('qaq-review-story-mode').value;
        var bilingualMode = document.getElementById('qaq-review-story-bilingual-mode').value;
        var tags = qaqReviewStorySelectedTags.slice();
        var wordText = words.map(function (w) { return w.word; }).join(', ');

        var wordCount = parseInt(document.getElementById('qaq-review-story-word-count').value, 10) ||
            settings.storyWordCount ||
            800;

        wordCount = Math.max(100, Math.min(5000, wordCount));

        settings.storyMode = storyMode;
        settings.storyBilingualMode = bilingualMode;
        settings.storyWordCount = wordCount;
        qaqSaveReviewSettings(settings);

        var modeInstructionMap = {
    story: '写一篇' + langName + '短篇故事',
    dialogue: '写一篇以对话为主的' + langName + '短文',
    diary: '写一篇' + langName + '日记',
    essay: '写一篇' + langName + '议论文或观点短文',
    cet: '写一篇适合中级水平的' + langName + '作文'
};

        var bilingualInstruction = '';
        if (bilingualMode === 'en') {
            bilingualInstruction = '输出仅使用英文，不要附中文。';
        } else if (bilingualMode === 'summary-cn') {
            bilingualInstruction = '正文使用英文，最后附一段中文总结或中文翻译。';
        } else if (bilingualMode === 'paragraph-cn') {
            bilingualInstruction = '请采用英文段落 + 对应中文段落的形式输出。';
        }

        var targetWords = words.map(function (w) { return w.word; });
var langCfg = window.qaqGetCurrentLangConfig ? window.qaqGetCurrentLangConfig() : { name: '英语' };
var langName = langCfg.name || '英语';

var prompt =
    '你是' + langName + '学习内容生成助手。请根据给定单词生成内容，并严格返回 JSON，不要输出 JSON 以外的任何文字。\n\n' +
    '【必须覆盖的目标单词】\n' + targetWords.join(', ') + '\n\n' +
    '【任务类型】' + (modeInstructionMap[storyMode] || langName + '短篇故事') + '\n' +
    '【风格标签】' + (tags.length ? tags.join('、') : '不限') + '\n' +
    '【目标' + langName + '词数】约 ' + wordCount + ' 词\n' +
    '【双语模式】' + bilingualMode + '\n\n' +

    '要求：\n' +
    '1. 尽可能覆盖全部目标单词，优先保证每个单词至少出现一次。\n' +
    '2. 内容使用' + langName + '，自然、连贯、适合' + langName + '学习者。\n' +
    '3. 每个段落必须同时给出' + langName + '原文和中文。\n' +
    '4. 每个句子必须同时给出' + langName + '原文和中文。\n' +
    '5. 返回中必须明确列出实际使用的单词 usedWords。\n' +
    '6. 如果有漏掉的单词，必须列入 omittedWords。\n' +
    '7. 只能返回合法 JSON。\n\n' +

    '返回格式如下：\n' +
    '{\n' +
    '  "title": "文章标题",\n' +
    '  "usedWords": ["word1", "word2"],\n' +
    '  "omittedWords": [],\n' +
    '  "paragraphs": [\n' +
    '    {\n' +
    '      "en": "' + langName + '段落",\n' +
    '      "cn": "中文段落",\n' +
    '      "sentences": [\n' +
    '        {\n' +
    '          "en": "' + langName + '句子",\n' +
    '          "cn": "中文句子",\n' +
    '          "usedWords": ["word1"]\n' +
    '        }\n' +
    '      ]\n' +
    '    }\n' +
    '  ]\n' +
    '}';

        var stopBtn = document.getElementById('qaq-review-story-stop-btn');
        var genBtn = document.getElementById('qaq-review-story-generate-btn');

        try {
            qaqReviewStoryGenerating = true;
            qaqReviewStoryAbortCtrl = new AbortController();

            if (stopBtn) stopBtn.style.display = '';
            if (genBtn) genBtn.disabled = true;

            document.getElementById('qaq-review-story-output').textContent = '正在生成，请稍等...';

            qaqShowStoryProgress('正在生成小说', '正在整理本轮单词与标签...');
            qaqUpdateImportProgress(15, '正在整理提示词...');

            var content = '';

            qaqUpdateImportProgress(40, '正在请求模型...');
            if (cfg.provider === 'openai' || cfg.provider === 'minimax-openai') {
                content = await qaqReviewGenerateByOpenAICompatible(
                    cfg,
                    prompt,
                    qaqReviewStoryAbortCtrl.signal
                );
            } else if (cfg.provider === 'minimax-native') {
                content = await qaqReviewGenerateByMiniMaxNative(
                    cfg,
                    prompt,
                    qaqReviewStoryAbortCtrl.signal
                );
            } else {
                throw new Error('不支持的 provider');
            }

            qaqUpdateImportProgress(70, '正在整理生成结果...');
            var parsedStory = qaqParseStructuredStory(content);

            var fullEn = parsedStory.paragraphs.map(function (p) {
                return p.en || (p.sentences || []).map(function (s) { return s.en; }).join(' ');
            }).join('\n\n');

            var fullCn = parsedStory.paragraphs.map(function (p) {
                return p.cn || (p.sentences || []).map(function (s) { return s.cn; }).join('');
            }).join('\n\n');

            var missedWords = qaqCheckStoryCoverage(
                words.map(function (w) { return w.word; }),
                parsedStory.usedWords
            );

            qaqUpdateImportProgress(75, '正在提取所有单词...');
            var allWords = qaqExtractAllEnglishWords(fullEn);

            qaqUpdateImportProgress(80, '正在获取单词释义...');
            var wordMeanings = await qaqBatchFetchWordMeanings(allWords, words, cfg);

            var storyData = {
                title: parsedStory.title || qaqGenerateStoryTitle(
                    fullEn,
                    tags.slice(),
                    words.map(function (w) { return w.word; }),
                    storyMode
                ),
                content: fullEn,
                contentCn: fullCn,
                paragraphs: parsedStory.paragraphs || [],
                usedWords: parsedStory.usedWords || [],
                omittedWords: parsedStory.omittedWords && parsedStory.omittedWords.length
                    ? parsedStory.omittedWords
                    : missedWords,
                wordMeanings: wordMeanings,
                createdAt: Date.now(),
                tags: tags.slice(),
                wordCount: wordCount,
                words: words.map(function (w) { return w.word; }),
                sourceWords: words.map(function (w) {
                    return {
                        id: w.id || '',
                        word: w.word || '',
                        meaning: w.meaning || '',
                        phonetic: w.phonetic || '',
                        example: w.example || '',
                        exampleCn: w.exampleCn || ''
                    };
                }),
                bookName: (words[0] && words[0].bookName) || '',
                mode: storyMode,
                bilingualMode: bilingualMode
            };

            qaqRenderStructuredStory(storyData);
            qaqSaveLastReviewStory(storyData);
            qaqPushReviewStoryHistory(storyData);

            document.getElementById('qaq-review-story-meta').textContent =
                '已生成 · ' + wordCount + ' 词目标 · ' + qaqFormatDateTime(storyData.createdAt);

            qaqUpdateImportProgress(100, '生成完成');
            setTimeout(function () {
                qaqHideStoryProgress();
            }, 250);

            qaqToast('小说已生成');
        } catch (err) {
            console.error(err);
            qaqHideStoryProgress();

            if (err && err.name === 'AbortError') {
                document.getElementById('qaq-review-story-output').textContent = '已停止生成';
                document.getElementById('qaq-review-story-meta').textContent = '生成已中止';
                qaqToast('已停止生成');
            } else {
                document.getElementById('qaq-review-story-output').textContent = '生成失败：' + (err.message || '未知错误');
                qaqToast('生成失败');
            }
        } finally {
            qaqReviewStoryGenerating = false;
            qaqReviewStoryAbortCtrl = null;
            if (stopBtn) stopBtn.style.display = 'none';
            if (genBtn) genBtn.disabled = false;
        }
    }

    function qaqExtractAllEnglishWords(text) {
        var words = {};
        String(text || '').replace(/\b([A-Za-z][A-Za-z'-]*)\b/g, function (m, word) {
            var key = word.toLowerCase();
            words[key] = word;
        });
        return Object.values(words);
    }

    async function qaqBatchFetchWordMeanings(allWords, sourceWords, cfg) {
        if (!allWords || !allWords.length) return {};

        var meanings = {};
        var unknownWords = [];

        for (var i = 0; i < allWords.length; i++) {
            var word = allWords[i];
            var key = word.toLowerCase();
            
            var found = sourceWords.find(function (w) {
                return w.word.toLowerCase() === key;
            });

            if (found) {
                meanings[key] = {
                    word: found.word,
                    phonetic: found.phonetic || '',
                    meaning: found.meaning || '暂无释义',
                    example: found.example || '',
                    exampleCn: found.exampleCn || ''
                };
                continue;
            }

            found = qaqFindWordFromAllBooksSync(word);
            if (found) {
                meanings[key] = {
                    word: found.word,
                    phonetic: found.phonetic || '',
                    meaning: found.meaning || '暂无释义',
                    example: found.example || '',
                    exampleCn: found.exampleCn || ''
                };
            } else {
                unknownWords.push(word);
            }
        }

        if (unknownWords.length > 0 && cfg.key && cfg.model) {
            try {
                var batchSize = 20;
                for (var j = 0; j < unknownWords.length; j += batchSize) {
                    var batch = unknownWords.slice(j, j + batchSize);
                    
                    var prompt =
                        '请为以下英语单词提供释义，只返回 JSON 数组，不要其他解释。\n' +
                        '单词列表：' + batch.join(', ') + '\n\n' +
                        '返回格式：\n' +
                        '[\n' +
                        '  {\n' +
                        '    "word": "单词原形",\n' +
                        '    "phonetic": "音标",\n' +
                        '    "meaning": "中文释义"\n' +
                        '  }\n' +
                        ']\n\n' +
                        '要求：释义简洁准确，适合四六级学习';

                    var content = '';
                    if (cfg.provider === 'openai' || cfg.provider === 'minimax-openai') {
                        content = await qaqReviewGenerateByOpenAICompatible(cfg, prompt);
                    } else if (cfg.provider === 'minimax-native') {
                        content = await qaqReviewGenerateByMiniMaxNative(cfg, prompt);
                    }

                    var parsed = qaqExtractJsonBlock(content);
                    if (Array.isArray(parsed)) {
                        for (var k = 0; k < parsed.length; k++) {
                            var item = parsed[k];
                            if (item.word) {
                                meanings[item.word.toLowerCase()] = {
                                    word: item.word,
                                    phonetic: item.phonetic || '',
                                    meaning: item.meaning || '暂无释义',
                                    example: '',
                                    exampleCn: ''
                                };
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('批量获取释义失败：', err);
            }
        }

        return meanings;
    }

    document.getElementById('qaq-review-story-back').addEventListener('click', function () {
        if (qaqReviewStoryAbortCtrl) {
            qaqReviewStoryAbortCtrl.abort();
        }
        qaqGoBackTo((window.qaqWordbankPage || document.getElementById('qaq-wordbank-page')), qaqReviewStoryPage);
        if(window.qaqSwitchWordbankTab) window.qaqSwitchWordbankTab('review');
    });

    document.getElementById('qaq-review-story-tag-search').addEventListener('input', function () {
        qaqRenderReviewStoryTags(this.value);
    });

    document.getElementById('qaq-review-story-custom-add-btn').addEventListener('click', function () {
        var input = document.getElementById('qaq-review-story-custom-input');
        var val = input.value.trim();
        if (!val) return qaqToast('请输入标签');

        qaqReviewStoryCustomTags = qaqGetReviewStoryCustomTags();

        var allBuiltInTags = qaqGetAllBuiltInStoryTags();
    if (allBuiltInTags.indexOf(val) === -1 && qaqReviewStoryCustomTags.indexOf(val) === -1) {
            qaqReviewStoryCustomTags.push(val);
            qaqSaveReviewStoryCustomTags(qaqReviewStoryCustomTags);
        }

        if (qaqReviewStorySelectedTags.indexOf(val) === -1) {
            qaqReviewStorySelectedTags.push(val);
        }

        input.value = '';
        qaqRenderReviewStoryTags(document.getElementById('qaq-review-story-tag-search').value);
        qaqToast('标签已添加');
    });

    document.getElementById('qaq-review-story-generate-btn').addEventListener('click', function () {
        qaqGenerateReviewStory();
    });

    document.getElementById('qaq-review-story-stop-btn').addEventListener('click', function () {
        if (qaqReviewStoryAbortCtrl) {
            qaqReviewStoryAbortCtrl.abort();
        }
    });

    function qaqFindWordFromAllBooksSync(rawWord) {
        var key = String(rawWord || '').toLowerCase().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
        if (!key) return null;

        var books = qaqGetWordbooks();
        for (var i = 0; i < books.length; i++) {
            var words = books[i].words || [];
            for (var j = 0; j < words.length; j++) {
                if (String(words[j].word || '').toLowerCase() === key) {
                    return words[j];
                }
            }
        }
        return null;
    }

    function qaqNormalizeOpenAIChatUrl(url) {
        url = String(url || '').trim().replace(/\/+$/, '');
        if (!url) return '';

        if (/\/chat\/completions$/i.test(url)) return url;
        if (/\/v\d+$/i.test(url)) return url + '/chat/completions';
        if (/\/v\d+\/$/i.test(url)) return url + 'chat/completions';
        return url + '/chat/completions';
    }

    async function qaqReviewGenerateByOpenAICompatible(cfg, prompt, signal) {
        var url = qaqNormalizeOpenAIChatUrl(cfg.url);

        var resp = await fetch(url, {
        method: 'POST',
        signal: signal,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + cfg.key
        },
        body: JSON.stringify({
            model: cfg.model,
            messages: [
                {
                    role: 'system',
                    content: '你是一个英语学习助手，必须严格返回 JSON。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.4
        })
    });

        if (!resp.ok) {
            var errText = await resp.text().catch(function () { return ''; });
            throw new Error('兼容接口请求失败：' + resp.status + ' ' + errText);
        }

        var data = await resp.json();
        var content =
            (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
            (data.choices && data.choices[0] && data.choices[0].text) ||
            '';

        if (!content) {
            throw new Error('兼容接口返回为空');
        }

        var usage = data.usage;
        if (usage && usage.total_tokens) {
            if (window.qaqAddTokens) window.qaqAddTokens(usage.total_tokens);
        } else {
            if (window.qaqAddTokens) window.qaqAddTokens(qaqEstimateTokens(prompt) + qaqEstimateTokens(content));
        }
        return content;
    }

    function qaqOpenWordPopover(wordInfo, rect) {
        if (!wordInfo) return;

        var pop = document.getElementById('qaq-word-popover');
        var card = document.getElementById('qaq-word-popover-card');

        document.getElementById('qaq-word-popover-word').textContent = wordInfo.word || '';
        document.getElementById('qaq-word-popover-phonetic').textContent = wordInfo.phonetic || '';
        document.getElementById('qaq-word-popover-meaning').textContent = wordInfo.meaning || '暂无释义';

        pop.style.display = 'block';

        requestAnimationFrame(function () {
            var top = rect.top - card.offsetHeight - 10;
            if (top < 12) top = rect.bottom + 10;

            var left = rect.left + rect.width / 2 - card.offsetWidth / 2;
            if (left < 12) left = 12;
            if (left + card.offsetWidth > window.innerWidth - 12) {
                left = window.innerWidth - card.offsetWidth - 12;
            }

            card.style.top = top + 'px';
            card.style.left = left + 'px';
        });

        document.getElementById('qaq-word-popover-read-btn').onclick = function () {
            qaqSpeakWord(wordInfo.word || '');
        };
        document.getElementById('qaq-word-popover-close-btn').onclick = function () {
            qaqCloseWordPopover();
        };
    }

    function qaqCloseWordPopover() {
        var pop = document.getElementById('qaq-word-popover');
        if (pop) pop.style.display = 'none';
    }

    function qaqNormalizeMiniMaxNativeUrl(url, groupId) {
        url = String(url || '').trim().replace(/\/+$/, '');

        if (!url) {
            url = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
        }

        if (groupId) {
            if (url.indexOf('GroupId=') === -1) {
                url += (url.indexOf('?') > -1 ? '&' : '?') + 'GroupId=' + encodeURIComponent(groupId);
            }
        }

        return url;
    }

    async function qaqReviewGenerateByMiniMaxNative(cfg, prompt, signal) {
        var url = qaqNormalizeMiniMaxNativeUrl(cfg.url, cfg.minimaxGroupId);

        var resp = await fetch(url, {
        method: 'POST',
        signal: signal,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + cfg.key
        },
        body: JSON.stringify({
            model: cfg.model,
            temperature: 0.4,
            messages: [
                {
                    sender_type: 'SYSTEM',
                    sender_name: '系统',
                    text: '你是一个英语学习助手，必须严格返回 JSON。'
                },
                {
                    sender_type: 'USER',
                    sender_name: '用户',
                    text: prompt
                }
            ]
        })
    });

        if (!resp.ok) {
            var errText = await resp.text().catch(function () { return ''; });
            throw new Error('MiniMax 原生接口请求失败：' + resp.status + ' ' + errText);
        }

        var data = await resp.json();

        var content =
            data.reply ||
            (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
            (data.base_resp && data.base_resp.status_msg) ||
            '';

        if (!content) {
            throw new Error('MiniMax 原生接口返回为空');
        }

        var usage = data.usage;
        if (usage && usage.total_tokens) {
            if (window.qaqAddTokens) window.qaqAddTokens(usage.total_tokens);
        } else {
            if (window.qaqAddTokens) window.qaqAddTokens(qaqEstimateTokens(prompt) + qaqEstimateTokens(content));
        }
        return content;
    }


    /* ===== 背单词模块基石 ===== */
    var qaqWordReviewPage = document.getElementById('qaq-word-review-page');

    var qaqReviewSession = {
        bookId: '',
        bookName: '',
        queue: [],
        current: null,
        history: [],
        roundTotal: 0,
        shownMeaning: false,
        pendingLevel: '',
        stats: {
            unknown: 0,
            vague: 0,
            known: 0
        }
    };

    var qaqReviewSettingsPage = document.getElementById('qaq-review-settings-page');

    function qaqOpenReviewSettingsPage() {
    var settings = qaqGetReviewSettings();

    document.getElementById('qaq-rs-count').value = settings.roundCount || 20;
    document.getElementById('qaq-rs-rate').value = settings.speechRate || 0.9;
    document.getElementById('qaq-rs-story-word-count').value = settings.storyWordCount || 800;
    document.getElementById('qaq-rs-provider').value = settings.apiProvider || 'openai';
    document.getElementById('qaq-rs-api-url').value = settings.apiUrl || '';
    document.getElementById('qaq-rs-api-key').value = settings.apiKey || '';
    document.getElementById('qaq-rs-api-model').value = settings.apiModel || '';
    
    // 语音专属配置
    document.getElementById('qaq-rs-minimax-group').value = settings.minimaxGroupId || '';
    document.getElementById('qaq-rs-mm-voice-id').value = settings.mmVoiceId || 'female-shaonv';
    document.getElementById('qaq-rs-mm-api-key').value = settings.mmApiKey || '';
    document.getElementById('qaq-rs-mm-region').value = settings.mmRegion || 'https://api.minimax.chat/v1/t2a_v2';
    document.getElementById('qaq-rs-mm-model').value = settings.mmModel || 'speech-01-turbo';

    var toggleMap = {
        'qaq-rs-random': settings.random,
        'qaq-rs-auto-pronounce': settings.autoPronounce,
        'qaq-rs-show-phonetic': settings.showPhonetic,
        'qaq-rs-show-example': settings.showExample,
        'qaq-rs-skip-marked': settings.skipMarked,
        'qaq-rs-mm-voice': settings.mmVoice
    };

    Object.keys(toggleMap).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.toggle('qaq-toggle-on', !!toggleMap[id]);
    });

    qaqRsRenderModelSelect(qaqGetReviewModelCache(
        document.getElementById('qaq-rs-provider').value,
        document.getElementById('qaq-rs-api-url').value.trim()
    ));

    // 均包装成精美的底部弹窗菜单
    qaqWrapSelectAsModal('qaq-rs-provider', '选择接口类型');
    qaqWrapSelectAsModal('qaq-rs-model-select', '选择生成模型');
    qaqWrapSelectAsModal('qaq-rs-mm-region', '选择语音服务节点');

    qaqSwitchTo(qaqReviewSettingsPage);
}

    function qaqRsUpdateProviderUI() {
        var provider = document.getElementById('qaq-rs-provider').value;
        document.getElementById('qaq-rs-minimax-group').style.display = provider === 'minimax-native' ? '' : 'none';
        document.getElementById('qaq-rs-minimax-group-label').style.display = provider === 'minimax-native' ? '' : 'none';
    }

    function qaqRsRenderModelSelect(models) {
    var select = document.getElementById('qaq-rs-model-select');
    var currentModel = document.getElementById('qaq-rs-api-model').value.trim();
    select.innerHTML = '<option value="">选择已拉取模型</option>';
    (models || []).forEach(function (model) {
        var opt = document.createElement('option');
        opt.value = model;
        opt.textContent = model;
        if (model === currentModel) opt.selected = true;
        select.appendChild(opt);
    });
    
    // 【新增】：拉取新模型后，如果它变成了自定义按钮，刷新它的文字
    if (select._updateBtnText) {
        select._updateBtnText();
    }
}

    function qaqRsSaveSettings() {
    var settings = qaqGetReviewSettings();
    settings.roundCount = Math.max(1, parseInt(document.getElementById('qaq-rs-count').value, 10) || 20);
    settings.random = document.getElementById('qaq-rs-random').classList.contains('qaq-toggle-on');
    settings.autoPronounce = document.getElementById('qaq-rs-auto-pronounce').classList.contains('qaq-toggle-on');
    settings.speechRate = Math.max(0.6, Math.min(1.2, parseFloat(document.getElementById('qaq-rs-rate').value) || 0.9));
    settings.showPhonetic = document.getElementById('qaq-rs-show-phonetic').classList.contains('qaq-toggle-on');
    settings.showExample = document.getElementById('qaq-rs-show-example').classList.contains('qaq-toggle-on');
    settings.skipMarked = document.getElementById('qaq-rs-skip-marked').classList.contains('qaq-toggle-on');
    settings.storyWordCount = Math.max(100, Math.min(5000, parseInt(document.getElementById('qaq-rs-story-word-count').value, 10) || 800));
    settings.apiProvider = document.getElementById('qaq-rs-provider').value;
    settings.apiUrl = document.getElementById('qaq-rs-api-url').value.trim();
    settings.apiKey = document.getElementById('qaq-rs-api-key').value.trim();
    settings.apiModel = document.getElementById('qaq-rs-api-model').value.trim();
    
    // 保存语音专属配置
    settings.minimaxGroupId = document.getElementById('qaq-rs-minimax-group').value.trim();
    settings.mmVoiceId = document.getElementById('qaq-rs-mm-voice-id').value.trim();
    settings.mmApiKey = document.getElementById('qaq-rs-mm-api-key').value.trim();
    settings.mmRegion = document.getElementById('qaq-rs-mm-region').value;
    settings.mmModel = document.getElementById('qaq-rs-mm-model').value.trim();
    settings.mmVoice = document.getElementById('qaq-rs-mm-voice').classList.contains('qaq-toggle-on');
    
    qaqSaveReviewSettings(settings);

    if (qaqReviewSession.current) qaqRenderCurrentReviewWord();
    if (document.getElementById('qaq-review-story-word-count')) {
        document.getElementById('qaq-review-story-word-count').value = settings.storyWordCount || 800;
    }

    qaqToast('设置已保存');
}

    document.getElementById('qaq-review-settings-back').addEventListener('click', function () {
        qaqRsSaveSettings();
        qaqGoBackTo((window.qaqWordbankPage || document.getElementById('qaq-wordbank-page')), qaqReviewSettingsPage);
    });

    document.getElementById('qaq-rs-save-btn').addEventListener('click', function () {
        qaqRsSaveSettings();
        qaqGoBackTo((window.qaqWordbankPage || document.getElementById('qaq-wordbank-page')), qaqReviewSettingsPage);
    });

    document.getElementById('qaq-rs-provider').addEventListener('change', qaqRsUpdateProviderUI);

    document.getElementById('qaq-rs-model-select').addEventListener('change', function () {
        if (this.value) document.getElementById('qaq-rs-api-model').value = this.value;
    });

    document.getElementById('qaq-rs-fetch-models-btn').addEventListener('click', async function () {
        var provider = document.getElementById('qaq-rs-provider').value;
        var apiUrl = document.getElementById('qaq-rs-api-url').value.trim();
        var apiKey = document.getElementById('qaq-rs-api-key').value.trim();

        try {
            this.disabled = true;
            this.textContent = '拉取中...';
            var models = await qaqFetchReviewModels(provider, apiUrl, apiKey);
            qaqSaveReviewModelCache(provider, apiUrl, models);
            qaqRsRenderModelSelect(models);

            if (models.length && !document.getElementById('qaq-rs-api-model').value.trim()) {
                document.getElementById('qaq-rs-api-model').value = models[0]; document.getElementById('qaq-rs-model-select').value = models[0];
            }
            qaqToast('模型拉取成功');
        } catch (err) {
            console.error(err);
            qaqToast(err.message || '拉取模型失败');
        } finally {
            this.disabled = false;
            this.textContent = '拉取模型';
        }
    });

    // 注意最后新加的一个元素
['qaq-rs-random', 'qaq-rs-auto-pronounce', 'qaq-rs-show-phonetic', 'qaq-rs-show-example', 'qaq-rs-skip-marked', 'qaq-rs-mm-voice'].forEach(function (id) {
    var el = document.getElementById(id + '-row');
    if (el) {
        el.addEventListener('click', function () {
            document.getElementById(id).classList.toggle('qaq-toggle-on');
        });
    }
});

    /* ===== 背单词会话存储 ===== */
    function qaqSaveCurrentReviewSession() {
        if (!qaqReviewSession || !qaqReviewSession.bookId) return;

        var copy = JSON.parse(JSON.stringify(qaqReviewSession));
        copy.updatedAt = Date.now();
        qaqCacheSet('qaq-word-review-last-session', copy);
    }

    function qaqGetCurrentReviewSession() {
        return qaqCacheGet('qaq-word-review-last-session', null);
    }

    function qaqClearCurrentReviewSession() {
        qaqCacheInvalidate('qaq-word-review-last-session');
        localStorage.removeItem('qaq-word-review-last-session');
    }

    function qaqSaveLastFinishedReview(data) {
        qaqCacheSet('qaq-word-review-last-finished', data || null);
    }

    function qaqGetLastFinishedReview() {
        return qaqCacheGet('qaq-word-review-last-finished', null);
    }

    function qaqGetReviewPetMessages() {
        return qaqCacheGet('qaq-review-pet-messages', {});
    }

    function qaqSaveReviewPetMessages(data) {
        qaqCacheSet('qaq-review-pet-messages', data || {});
    }

   async function qaqGenerateWordStudyDataForItem(wordObj, cfg) {
    var langCfg = window.qaqGetCurrentLangConfig ? window.qaqGetCurrentLangConfig() : window.qaqWordbankLangConfig['en'];
    var prompt = langCfg.studyDataPrompt(wordObj);

    var content = '';

    if (cfg.provider === 'openai' || cfg.provider === 'minimax-openai') {
        content = await qaqReviewGenerateByOpenAICompatible(cfg, prompt);
    } else if (cfg.provider === 'minimax-native') {
        content = await qaqReviewGenerateByMiniMaxNative(cfg, prompt);
    } else {
        throw new Error('不支持的 provider');
    }

    var parsed = qaqExtractJsonBlock(content);
    if (!parsed) {
        throw new Error('模型返回内容无法解析为 JSON');
    }

    return {
        phonetic: parsed.phonetic || '',
        example: parsed.example || '',
        exampleCn: parsed.exampleCn || '',
        petMsgKnown: parsed.petMsgKnown || '',
        petMsgVague: parsed.petMsgVague || '',
        petMsgUnknown: parsed.petMsgUnknown || ''
    };
}

    async function qaqGenerateRoundStudyData(words) {
        var cfg = qaqGetReviewApiConfig();
        if (!cfg.key || !cfg.model) {
            throw new Error('请先填写 API Key 和 Model');
        }
        if ((cfg.provider === 'openai' || cfg.provider === 'minimax-openai') && !cfg.url) {
            throw new Error('请先填写兼容接口 URL');
        }

        var total = words.length;
        if (window.qaqShowImportProgress) window.qaqShowImportProgress('正在生成学习内容', '正在为本轮单词生成音标和例句...');
        if (window.qaqUpdateImportProgress) window.qaqUpdateImportProgress(0, '准备开始...');

        for (var i = 0; i < words.length; i++) {
            var item = words[i];

            if (item.phonetic && item.example && item.exampleCn) {
                var skipPercent = Math.round(((i + 1) / total) * 100);
                if (window.qaqUpdateImportProgress) window.qaqUpdateImportProgress(skipPercent, '跳过已有内容：' + item.word);
                continue;
            }

            try {
                var generated = await qaqGenerateWordStudyDataForItem(item, cfg);
                item.phonetic = generated.phonetic || item.phonetic || '';
                item.example = generated.example || item.example || '';
                item.exampleCn = generated.exampleCn || item.exampleCn || '';
                item.petMsgKnown = generated.petMsgKnown || item.petMsgKnown || '';
                item.petMsgVague = generated.petMsgVague || item.petMsgVague || '';
                item.petMsgUnknown = generated.petMsgUnknown || item.petMsgUnknown || '';
                qaqPersistGeneratedWordData(item);
            } catch (err) {
                console.error('生成失败: ', item.word, err);
            }

            var percent = Math.round(((i + 1) / total) * 100);
            if (window.qaqUpdateImportProgress) window.qaqUpdateImportProgress(percent, '正在生成：' + item.word);

            await new Promise(function (resolve) { setTimeout(resolve, 80); });
        }

        if (window.qaqHideImportProgress) setTimeout(window.qaqHideImportProgress, 180);
    }

    /* ===== 背单词朗读优化 ===== */
    var qaqSpeechVoiceCache = null;

    function qaqLoadSpeechVoices() {
        if (!('speechSynthesis' in window)) return [];
        var voices = speechSynthesis.getVoices() || [];
        if (voices.length) qaqSpeechVoiceCache = voices;
        return voices;
    }

    function qaqPickEnglishVoice() {
        var voices = qaqLoadSpeechVoices();
        if (!voices.length && qaqSpeechVoiceCache) voices = qaqSpeechVoiceCache;

        if (!voices || !voices.length) return null;

        return (
            voices.find(function (v) { return /en-US/i.test(v.lang) && /female|samantha|zira|aria|jenny|google/i.test(v.name); }) ||
            voices.find(function (v) { return /en-GB/i.test(v.lang) && /female|serena|libby|google/i.test(v.name); }) ||
            voices.find(function (v) { return /en-US/i.test(v.lang); }) ||
            voices.find(function (v) { return /^en/i.test(v.lang); }) ||
            null
        );
    }

function qaqPickVoiceForLang(lang) {
    if (!lang || /^en/i.test(lang)) return qaqPickEnglishVoice();

    var voices = qaqLoadSpeechVoices();
    if (!voices.length && qaqSpeechVoiceCache) voices = qaqSpeechVoiceCache;
    if (!voices || !voices.length) return null;

    var langPrefix = lang.split('-')[0].toLowerCase();

    return (
        voices.find(function (v) { return v.lang.toLowerCase() === lang.toLowerCase(); }) ||
        voices.find(function (v) { return v.lang.toLowerCase().indexOf(langPrefix) === 0; }) ||
        null
    );
}

    if ('speechSynthesis' in window) {
        qaqLoadSpeechVoices();
        if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
            speechSynthesis.onvoiceschanged = function () {
                qaqLoadSpeechVoices();
            };
        }
    }

    function qaqRenderReviewHome() {
        var listEl = document.getElementById('qaq-review-book-list');
        var emptyEl = document.getElementById('qaq-review-book-empty');
        var statsEl = document.getElementById('qaq-review-home-stats');
        if (!listEl) return;

        statsEl.textContent = '背单词';

        var continueCard = document.getElementById('qaq-review-continue-card');
        var continueMeta = document.getElementById('qaq-review-continue-meta');
        var continueCount = document.getElementById('qaq-review-continue-count');
        var lastSession = qaqGetCurrentReviewSession();

        continueCard.classList.remove('qaq-disabled');
        if (lastSession && lastSession.bookId && (lastSession.current || (lastSession.queue && lastSession.queue.length))) {
            var leftCount = (lastSession.queue ? lastSession.queue.length : 0) + (lastSession.current ? 1 : 0);
            continueMeta.textContent = '词库：' + (lastSession.bookName || '未知词库');
            continueCount.textContent = '剩余 ' + leftCount + ' / ' + (lastSession.roundTotal || leftCount) + ' 个';
        } else {
            continueMeta.textContent = '暂无未完成学习';
            continueCount.textContent = '点击继续学习';
            continueCard.classList.add('qaq-disabled');
        }

        var repeatCard = document.getElementById('qaq-review-repeat-card');
        var repeatMeta = document.getElementById('qaq-review-repeat-meta');
        var repeatCount = document.getElementById('qaq-review-repeat-count');
        var lastFinished = qaqGetLastFinishedReview();

        repeatCard.classList.remove('qaq-disabled');
        if (lastFinished && lastFinished.bookId && lastFinished.words && lastFinished.words.length) {
            repeatMeta.textContent = '词库：' + (lastFinished.bookName || '未知词库');
            repeatCount.textContent = '上次完成 ' + lastFinished.words.length + ' 个，点击复习';
        } else {
            repeatMeta.textContent = '暂无上次完成记录';
            repeatCount.textContent = '点击重新复习';
            repeatCard.classList.add('qaq-disabled');
        }

        var currentLang = window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en';
var books = qaqGetWordbooks().filter(function (book) {
    var bookLang = book.lang || 'en';
    return book.words && book.words.length && bookLang === currentLang;
});

        listEl.innerHTML = '';

        if (!books.length) {
            emptyEl.style.display = 'block';
            return;
        }

        emptyEl.style.display = 'none';

        books.forEach(function (book) {
            var div = document.createElement('div');
            div.className = 'qaq-wordbook-card';
            div.innerHTML =
                '<div class="qaq-wordbook-card-name">' + book.name + '</div>' +
                '<div class="qaq-wordbook-card-meta">点击开始新一轮学习</div>' +
                '<div class="qaq-wordbook-card-count">共 ' + (book.words ? book.words.length : 0) + ' 条</div>';

            div.addEventListener('click', function () {
                qaqOpenReviewStartModal(book);
            });

            listEl.appendChild(div);
        });

        continueCard.onclick = function () {
            var session = qaqGetCurrentReviewSession();
            if (!session || !session.bookId) return;
            qaqReviewSession = session;
            qaqSwitchTo(qaqWordReviewPage);
            if (window.qaqRenderReviewPetFloat) window.qaqRenderReviewPetFloat();
            qaqRenderCurrentReviewWord();
        };

        repeatCard.onclick = function () {
            var finished = qaqGetLastFinishedReview();
            if (!finished || !finished.words || !finished.words.length) return;

            qaqReviewSession = {
                bookId: finished.bookId,
                bookName: finished.bookName,
                queue: finished.words.slice(),
                current: null,
                history: [],
                roundTotal: finished.words.length,
                shownMeaning: false,
                pendingLevel: '',
                stats: {
                    unknown: 0,
                    vague: 0,
                    known: 0
                }
            };

            qaqSwitchTo(qaqWordReviewPage);
            if (window.qaqRenderReviewPetFloat) window.qaqRenderReviewPetFloat();
            qaqReviewGoNext();
        };
    }

    function qaqOpenReviewStartModal(book) {
        var settings = qaqGetReviewSettings();

        var sourceWords = (book.words || []).slice();
        if (settings.skipMarked) {
            sourceWords = sourceWords.filter(function (w) {
                return !qaqIsMarkedWord(book.id, w.id);
            });
        }

        var availableCount = sourceWords.length;

        if (!availableCount) {
            return qaqToast('这本词库没有可背的单词了');
        }

        modalTitle.textContent = '开始新一轮';
        modalBody.innerHTML =
            '<div class="qaq-plan-form">' +
                '<div class="qaq-plan-form-label">词库</div>' +
                '<input class="qaq-plan-form-input" type="text" value="' + book.name.replace(/"/g, '&quot;') + '" disabled>' +
                '<div class="qaq-plan-form-label">可背单词</div>' +
                '<input class="qaq-plan-form-input" type="text" value="' + availableCount + ' 个' + (settings.skipMarked ? '（已跳过标记）' : '') + '" disabled>' +
                '<div class="qaq-plan-form-label">本轮背多少单词</div>' +
                '<input class="qaq-plan-form-input" id="qaq-review-round-count" type="number" min="1" max="' + availableCount + '" value="' + Math.min(settings.roundCount || 20, availableCount) + '">' +
                '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#666;">' +
    '<input type="checkbox" id="qaq-review-round-generate" checked> 开始前生成音标、例句和桌宠语' +
'</label>' +
            '</div>';

        modalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">开始</button>';

        qaqOpenModal();

        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
        document.getElementById('qaq-modal-confirm').onclick = async function () {
            var count = parseInt(document.getElementById('qaq-review-round-count').value, 10) || 20;
            var needGenerate = document.getElementById('qaq-review-round-generate').checked;
            count = Math.max(1, Math.min(count, availableCount));

            settings.roundCount = count;
            qaqSaveReviewSettings(settings);

            var finalSource = (book.words || []).map(function (w) {
                return qaqNormalizeReviewWord(w, book.id, book.name);
            });

            if (settings.skipMarked) {
                finalSource = finalSource.filter(function (w) {
                    return !qaqIsMarkedWord(book.id, w.id);
                });
            }

            finalSource = settings.random ? qaqShuffle(finalSource) : finalSource.slice();
            finalSource = finalSource.slice(0, count);

            qaqCloseModal();

            if (needGenerate) {
                try {
                    await qaqGenerateRoundStudyData(finalSource);
                } catch (err) {
                    console.error(err);
                    qaqToast(err.message || '批量生成失败，继续开始本轮');
                }
            }

            qaqReviewSession = {
                bookId: book.id,
                bookName: book.name,
                queue: finalSource.slice(),
                current: null,
                history: [],
                roundTotal: finalSource.length,
                shownMeaning: false,
                pendingLevel: '',
                stats: {
                    unknown: 0,
                    vague: 0,
                    known: 0
                }
            };

            qaqSaveCurrentReviewSession();
            qaqSwitchTo(qaqWordReviewPage);
            if (window.qaqRenderReviewPetFloat) window.qaqRenderReviewPetFloat();
            qaqReviewGoNext();
        };
    }

    function qaqUpdateReviewTopBtns() {
        if (!qaqReviewSession.current) return;

        var favBtn = document.getElementById('qaq-word-review-fav-btn');
        var markBtn = document.getElementById('qaq-word-review-mark-btn');

        var isFav = qaqIsFavoriteWord(qaqReviewSession.current.id, qaqReviewSession.current.bookId);
        var isMarked = qaqIsMarkedWord(qaqReviewSession.current.bookId, qaqReviewSession.current.id);

        favBtn.style.opacity = isFav ? '1' : '0.75';
        markBtn.style.opacity = isMarked ? '1' : '0.75';

        favBtn.style.boxShadow = isFav ? '0 0 0 2px rgba(212,160,32,0.22)' : '';
        markBtn.style.boxShadow = isMarked ? '0 0 0 2px rgba(196,112,104,0.22)' : '';
    }

    function qaqNormalizeReviewWord(word, bookId, bookName) {
        return {
            id: word.id || qaqWordId(),
            word: word.word || '',
            meaning: word.meaning || '',
            phonetic: word.phonetic || '',
            example: word.example || '',
            exampleCn: word.exampleCn || '',
            bookId: bookId,
            bookName: bookName,
            mastery: 0,
            petMsgKnown: word.petMsgKnown || '',
            petMsgVague: word.petMsgVague || '',
            petMsgUnknown: word.petMsgUnknown || ''
        };
    }

    function qaqRenderCurrentReviewWord() {
        var item = qaqReviewSession.current;
        if (!item) return;

        var settings = qaqGetReviewSettings();

        document.getElementById('qaq-review-word').textContent = item.word || '（空）';

        var phoneticEl = document.getElementById('qaq-review-phonetic');
        phoneticEl.textContent = item.phonetic || '暂无音标';
        phoneticEl.style.display = settings.showPhonetic ? '' : 'none';

        var exampleEl = document.getElementById('qaq-review-example');
        var exampleWrapEl = exampleEl.parentElement;
        exampleEl.textContent = item.example || '暂无例句';
        exampleWrapEl.style.display = settings.showExample ? '' : 'none';

        var exampleCnEl = document.getElementById('qaq-review-example-cn');
        exampleCnEl.textContent = item.exampleCn || '暂无例句翻译';
        exampleCnEl.style.display = 'none';

        var meaningEl = document.getElementById('qaq-review-meaning');
        meaningEl.textContent = item.meaning || '暂无释义';
        meaningEl.style.display = 'none';

        document.getElementById('qaq-review-actions').style.display = 'flex';
        document.getElementById('qaq-review-next-wrap').style.display = 'none';

        qaqReviewSession.shownMeaning = false;
        qaqReviewSession.pendingLevel = '';

        document.getElementById('qaq-word-review-progress').textContent =
            '本轮 ' + qaqReviewSession.bookName + ' · 剩余 ' + (qaqReviewSession.queue.length + 1) + ' / ' + qaqReviewSession.roundTotal;

        qaqUpdateReviewTopBtns();

        if (settings.autoPronounce && item.word) {
            setTimeout(function () {
                if (qaqReviewSession.current && qaqReviewSession.current.id === item.id) {
                    qaqSpeakWord(item.word);
                }
            }, 120);
        }
    }

    function qaqReviewShowMeaning(level) {
        if (!qaqReviewSession.current) return;

        qaqReviewSession.pendingLevel = level;
        qaqReviewSession.shownMeaning = true;

        document.getElementById('qaq-review-meaning').style.display = 'block';
        document.getElementById('qaq-review-actions').style.display = 'none';
        document.getElementById('qaq-review-next-wrap').style.display = 'flex';
    }

    function qaqReviewRequeue(item, level) {
        if (!item) return;

        if (level === 'unknown') {
            item.mastery -= 2;
            qaqReviewSession.stats.unknown++;
            var insert1 = Math.min(2, qaqReviewSession.queue.length);
            qaqReviewSession.queue.splice(insert1, 0, item);
        } else if (level === 'vague') {
            item.mastery += 1;
            qaqReviewSession.stats.vague++;
            if (item.mastery < 3) {
                var insert2 = Math.min(4, qaqReviewSession.queue.length);
                qaqReviewSession.queue.splice(insert2, 0, item);
            }
        } else if (level === 'known') {
            item.mastery += 3;
            qaqReviewSession.stats.known++;
            if (item.mastery < 3) {
                qaqReviewSession.queue.push(item);
            }
        }
    }

    function qaqReviewGoNext() {
        if (!qaqReviewSession._startTime) {
            qaqReviewSession._startTime = Date.now();
        }
        if (!qaqReviewSession.queue.length) {
            qaqReviewFinishRound();
            return;
        }

        qaqReviewSession.current = qaqReviewSession.queue.shift();
        qaqSaveCurrentReviewSession();
        qaqRenderCurrentReviewWord();
    }

    function qaqReviewFinishCurrent() {
        if (!qaqReviewSession.current || !qaqReviewSession.pendingLevel) return;

        var snapshot = JSON.parse(JSON.stringify(qaqReviewSession.current));
        snapshot._pendingLevel = qaqReviewSession.pendingLevel;
        snapshot._queueSnapshot = JSON.parse(JSON.stringify(qaqReviewSession.queue));
        snapshot._statsSnapshot = JSON.parse(JSON.stringify(qaqReviewSession.stats));
        qaqReviewSession.history.push(snapshot);

        qaqReviewRequeue(qaqReviewSession.current, qaqReviewSession.pendingLevel);
        
        if (window.qaqShowPetEncourageBubble) {
            window.qaqShowPetEncourageBubble(qaqReviewSession.pendingLevel, qaqReviewSession.current);
        }

        qaqSaveCurrentReviewSession();
        qaqReviewGoNext();
    }

    function qaqReviewFinishRound() {
        var finishedWords = [];

        if (qaqReviewSession.current) {
            finishedWords.push({
                id: qaqReviewSession.current.id,
                word: qaqReviewSession.current.word || '',
                meaning: qaqReviewSession.current.meaning || '',
                phonetic: qaqReviewSession.current.phonetic || '',
                example: qaqReviewSession.current.example || '',
                exampleCn: qaqReviewSession.current.exampleCn || '',
                petMsgKnown: qaqReviewSession.current.petMsgKnown || '',
                petMsgVague: qaqReviewSession.current.petMsgVague || '',
                petMsgUnknown: qaqReviewSession.current.petMsgUnknown || '',
                bookId: qaqReviewSession.current.bookId || qaqReviewSession.bookId,
                bookName: qaqReviewSession.current.bookName || qaqReviewSession.bookName,
                mastery: qaqReviewSession.current.mastery || 0
            });
        }

        qaqReviewSession.history.forEach(function (item) {
            if (!finishedWords.find(function (x) { return x.id === item.id && x.bookId === item.bookId; })) {
                finishedWords.push({
                    id: item.id,
                    word: item.word || '',
                    meaning: item.meaning || '',
                    phonetic: item.phonetic || '',
                    example: item.example || '',
                    exampleCn: item.exampleCn || '',
                    petMsgKnown: item.petMsgKnown || '',
                    petMsgVague: item.petMsgVague || '',
                    petMsgUnknown: item.petMsgUnknown || '',
                    bookId: item.bookId || qaqReviewSession.bookId,
                    bookName: item.bookName || qaqReviewSession.bookName,
                    mastery: item.mastery || 0
                });
            }
        });

        qaqSaveLastFinishedReview({
            bookId: qaqReviewSession.bookId,
            bookName: qaqReviewSession.bookName,
            words: finishedWords,
            stats: qaqReviewSession.stats,
            finishedAt: Date.now()
        });

        var sessionDuration = Math.round((Date.now() - (qaqReviewSession._startTime || Date.now())) / 60000) || 1;
        if (window.qaqLogStudySession) {
            window.qaqLogStudySession(qaqReviewSession.bookName, finishedWords.length, sessionDuration);
        }

        qaqClearCurrentReviewSession();

        modalTitle.textContent = '本轮完成';
        modalBody.innerHTML =
            '<div style="text-align:center;font-size:13px;line-height:1.8;color:#666;">' +
            '<div style="font-size:18px;font-weight:700;color:#333;margin-bottom:6px;">这一轮背完啦</div>' +
            '<div>词库：' + qaqReviewSession.bookName + '</div>' +
            '<div>不认识：' + qaqReviewSession.stats.unknown + '</div>' +
            '<div>有点印象：' + qaqReviewSession.stats.vague + '</div>' +
            '<div>熟人：' + qaqReviewSession.stats.known + '</div>' +
            '</div>';

        modalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-review-finish-back">返回词库</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-review-finish-again">复习上次</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-review-finish-story" style="flex:1;">生成小说</button>';

        qaqOpenModal();

        document.getElementById('qaq-review-finish-back').onclick = function () {
            qaqCloseModal();
            qaqGoBackTo((window.qaqWordbankPage || document.getElementById('qaq-wordbank-page')), qaqWordReviewPage);
            if (window.qaqSwitchWordbankTab) window.qaqSwitchWordbankTab('review');
        };

        document.getElementById('qaq-review-finish-again').onclick = function () {
            var finished = qaqGetLastFinishedReview();
            qaqCloseModal();
            if (!finished || !finished.words || !finished.words.length) {
                return qaqToast('没有可复习的内容');
            }

            qaqReviewSession = {
                bookId: finished.bookId,
                bookName: finished.bookName,
                queue: finished.words.slice(),
                current: null,
                history: [],
                roundTotal: finished.words.length,
                shownMeaning: false,
                pendingLevel: '',
                stats: {
                    unknown: 0,
                    vague: 0,
                    known: 0
                }
            };

            qaqSaveCurrentReviewSession();
            qaqSwitchTo(qaqWordReviewPage);
            qaqReviewGoNext();
        };

        document.getElementById('qaq-review-finish-story').onclick = function () {
            qaqCloseModal();
            qaqReviewStorySelectedTags = [];
            qaqRenderReviewStoryPage();
            qaqSwitchTo(qaqReviewStoryPage);
        };
    }

    document.getElementById('qaq-word-review-back').addEventListener('click', function () {
        qaqSaveCurrentReviewSession();
        qaqGoBackTo((window.qaqWordbankPage || document.getElementById('qaq-wordbank-page')), qaqWordReviewPage);
        if (window.qaqSwitchWordbankTab) window.qaqSwitchWordbankTab('review');
    });

    document.getElementById('qaq-word-review-prev-btn').addEventListener('click', function () {
        if (!qaqReviewSession.history.length) return qaqToast('没有上一个单词');

        var prev = qaqReviewSession.history.pop();
        qaqReviewSession.queue = prev._queueSnapshot || [];
        qaqReviewSession.stats = prev._statsSnapshot || qaqReviewSession.stats;

        delete prev._queueSnapshot;
        delete prev._statsSnapshot;
        delete prev._pendingLevel;

        qaqReviewSession.current = prev;
        qaqSaveCurrentReviewSession();
        qaqRenderCurrentReviewWord();
        qaqToast('已返回上一个单词');
    });

    document.getElementById('qaq-word-review-fav-btn').addEventListener('click', function () {
        if (!qaqReviewSession.current) return;

        var added = qaqToggleFavoriteWord(qaqReviewSession.current);
        qaqUpdateReviewTopBtns();
        qaqToast(added ? '已收藏到我的单词本' : '已取消收藏');
    });

    document.getElementById('qaq-word-review-mark-btn').addEventListener('click', function () {
        if (!qaqReviewSession.current) return;

        var nowMarked = qaqToggleMarkedWord(qaqReviewSession.current.bookId, qaqReviewSession.current.id);
        qaqUpdateReviewTopBtns();

        if (nowMarked) {
            qaqToast('已标记，之后不会再出现');
            qaqReviewSession.queue = qaqReviewSession.queue.filter(function (item) {
                return !(item.bookId === qaqReviewSession.current.bookId && item.id === qaqReviewSession.current.id);
            });
        } else {
            qaqToast('已取消标记');
        }
    });

    var qaqReviewHomeSettingBtn = document.getElementById('qaq-review-home-setting-btn');
    if (qaqReviewHomeSettingBtn) {
        qaqReviewHomeSettingBtn.addEventListener('click', function () {
            qaqOpenReviewSettingsPage();
        });
    }

    function qaqExtractJsonBlock(text) {
        text = String(text || '').trim();
        if (!text) return null;

        try { return JSON.parse(text); } catch (e) { }

        var mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (mdMatch && mdMatch[1]) {
            try { return JSON.parse(mdMatch[1].trim()); } catch (e) { }
        }

        var jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[0]); } catch (e) { }
        }

        var arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            try { return JSON.parse(arrayMatch[0]); } catch (e) { }
        }

        console.log('无法解析的模型返回内容：', text.substring(0, 500));
        return null;
    }

    function qaqParseStructuredStory(content) {
        var parsed = qaqExtractJsonBlock(content);
        if (!parsed) throw new Error('模型返回内容无法解析为 JSON');

        if (!parsed.paragraphs || !Array.isArray(parsed.paragraphs) || !parsed.paragraphs.length) {
            throw new Error('返回内容缺少 paragraphs');
        }

        parsed.title = parsed.title || '生成结果';
        parsed.usedWords = Array.isArray(parsed.usedWords) ? parsed.usedWords : [];
        parsed.omittedWords = Array.isArray(parsed.omittedWords) ? parsed.omittedWords : [];

        parsed.paragraphs = parsed.paragraphs.map(function (p) {
            return {
                en: p && p.en ? String(p.en).trim() : '',
                cn: p && p.cn ? String(p.cn).trim() : '',
                sentences: Array.isArray(p && p.sentences)
                    ? p.sentences.map(function (s) {
                        return {
                            en: s && s.en ? String(s.en).trim() : '',
                            cn: s && s.cn ? String(s.cn).trim() : '',
                            usedWords: Array.isArray(s && s.usedWords) ? s.usedWords : []
                        };
                    }).filter(function (s) {
                        return s.en;
                    })
                    : []
            };
        }).filter(function (p) {
            return p.en || (p.sentences && p.sentences.length);
        });

        return parsed;
    }

    function qaqCheckStoryCoverage(targetWords, usedWords) {
        var target = (targetWords || []).map(function (w) {
            return String(w || '').trim().toLowerCase();
        }).filter(Boolean);

        var used = (usedWords || []).map(function (w) {
            return String(w || '').trim().toLowerCase();
        }).filter(Boolean);

        return target.filter(function (w) {
            return used.indexOf(w) === -1;
        });
    }

    function qaqPersistGeneratedWordData(wordObj) {
        var books = qaqGetWordbooks();
        var book = books.find(function (b) { return b.id === wordObj.bookId; });
        if (!book || !book.words) return;

        var hit = book.words.find(function (w) { return w.id === wordObj.id; });
        if (!hit) return;
        hit.petMsgKnown = wordObj.petMsgKnown || hit.petMsgKnown || '';
        hit.petMsgVague = wordObj.petMsgVague || hit.petMsgVague || '';
        hit.petMsgUnknown = wordObj.petMsgUnknown || hit.petMsgUnknown || '';
        hit.phonetic = wordObj.phonetic || hit.phonetic || '';
        hit.example = wordObj.example || hit.example || '';
        hit.exampleCn = wordObj.exampleCn || hit.exampleCn || '';

        qaqSaveWordbooks(books);

        if (qaqReviewSession.queue && qaqReviewSession.queue.length) {
            qaqReviewSession.queue.forEach(function (item) {
                if (item.id === wordObj.id && item.bookId === wordObj.bookId) {
                    item.phonetic = wordObj.phonetic;
                    item.example = wordObj.example;
                    item.exampleCn = wordObj.exampleCn;
                    item.petMsgKnown = wordObj.petMsgKnown || '';
                    item.petMsgVague = wordObj.petMsgVague || '';
                    item.petMsgUnknown = wordObj.petMsgUnknown || '';
                }
            });
        }

        if (qaqReviewSession.history && qaqReviewSession.history.length) {
            qaqReviewSession.history.forEach(function (item) {
                if (item.id === wordObj.id && item.bookId === wordObj.bookId) {
                    item.phonetic = wordObj.phonetic;
                    item.example = wordObj.example;
                    item.exampleCn = wordObj.exampleCn;
                    item.petMsgKnown = wordObj.petMsgKnown || '';
                    item.petMsgVague = wordObj.petMsgVague || '';
                    item.petMsgUnknown = wordObj.petMsgUnknown || '';
                }
            });
        }

        if (window.qaqCurrentWordbookId === wordObj.bookId) {
            if (window.qaqRenderWordbookDetail) window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
        }
        if (window.qaqRenderWordbookHome) window.qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
    }

    function qaqGetReviewModelCacheKey(provider, url) {
        return 'qaq-review-model-cache::' + (provider || 'openai') + '::' + (url || '');
    }

    function qaqSaveReviewModelCache(provider, url, models) {
        qaqCacheSet(
            qaqGetReviewModelCacheKey(provider, url),
            models || []
        );
    }

    function qaqGetReviewModelCache(provider, url) {
        return qaqCacheGet(
            qaqGetReviewModelCacheKey(provider, url),
            []
        );
    }

    async function qaqFetchReviewModels(provider, apiUrl, apiKey) {
        if (provider === 'minimax-native') {
            return ['abab6.5s-chat', 'abab7-chat-preview', 'abab7.5-chat', 'MiniMax-Text-01'];
        }

        if (!apiUrl) throw new Error('请先填写 API URL');
        if (!apiKey) throw new Error('请先填写 API Key');

        var modelsUrl = apiUrl.replace(/\/+$/, '');
        modelsUrl = modelsUrl.replace(/\/chat\/completions$/i, '/models');
        modelsUrl = modelsUrl.replace(/\/completions$/i, '/models');

        if (!/\/models$/i.test(modelsUrl)) {
            if (/\/v\d+$/i.test(modelsUrl)) modelsUrl += '/models';
            else modelsUrl += '/models';
        }

        var resp = await fetch(modelsUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!resp.ok) {
            var errText = await resp.text().catch(function () { return ''; });
            throw new Error('拉取模型失败：' + resp.status + ' ' + errText);
        }

        var data = await resp.json();
        var list = [];

        if (Array.isArray(data.data)) {
            list = data.data.map(function (item) {
                return item.id || item.model || '';
            }).filter(Boolean);
        } else if (Array.isArray(data.models)) {
            list = data.models.map(function (item) {
                return item.id || item.name || item.model || '';
            }).filter(Boolean);
        }

        list = Array.from(new Set(list));

        if (!list.length) {
            throw new Error('未获取到模型列表');
        }

        return list;
    }

    function qaqGetReviewApiConfig() {
        var settings = qaqGetReviewSettings();
        return {
            provider: settings.apiProvider || 'openai',
            url: settings.apiUrl || '',
            key: settings.apiKey || '',
            model: settings.apiModel || '',
            minimaxGroupId: settings.minimaxGroupId || ''
        };
    }

    // ====== 交互事件统一处理 ======
    (function () {
        function qaqHandleReviewAction(target) {
            if (!target) return false;

            var reviewBtn = target.closest('.qaq-word-review-btn');
            if (reviewBtn) {
                var level = reviewBtn.dataset.level;
                qaqReviewShowMeaning(level);
                return true;
            }

            var nextBtn = target.closest('#qaq-review-next-btn');
            if (nextBtn) {
                qaqReviewFinishCurrent();
                return true;
            }

            var exampleEl = target.closest('#qaq-review-example');
            if (exampleEl) {
                var cn = document.getElementById('qaq-review-example-cn');
                if (cn) {
                    cn.style.display = cn.style.display === 'none' ? 'block' : 'none';
                }
                return true;
            }

            var phoneticEl = target.closest('#qaq-review-phonetic');
            if (phoneticEl) {
                if (qaqReviewSession.current && qaqReviewSession.current.word) {
                    qaqSpeakWord(qaqReviewSession.current.word);
                }
                return true;
            }

            var cardEl = target.closest('#qaq-word-review-card');
            if (cardEl) {
                if (!qaqReviewSession.current || qaqReviewSession.shownMeaning) return true;
                var meaningEl = document.getElementById('qaq-review-meaning');
                if (meaningEl) meaningEl.style.display = 'block';
                return true;
            }

            return false;
        }

        document.addEventListener('click', function (e) {
            var page = document.getElementById('qaq-word-review-page');
            if (!page || !page.classList.contains('qaq-page-show')) return;

            if (qaqHandleReviewAction(e.target)) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);

        var actionsEl = document.getElementById('qaq-review-actions');
        var nextWrapEl = document.getElementById('qaq-review-next-wrap');

        if (actionsEl) {
            actionsEl.style.position = 'relative';
            actionsEl.style.zIndex = '20';
            actionsEl.style.pointerEvents = 'auto';
        }

        if (nextWrapEl) {
            nextWrapEl.style.position = 'relative';
            nextWrapEl.style.zIndex = '20';
            nextWrapEl.style.pointerEvents = 'auto';
        }

        document.querySelectorAll('.qaq-word-review-btn, #qaq-review-next-btn').forEach(function (el) {
            el.style.position = 'relative';
            el.style.zIndex = '21';
            el.style.pointerEvents = 'auto';
            if (el.tagName === 'BUTTON') el.type = 'button';
        });
    })();

    function qaqIsFavoriteWord(wordId, bookId) {
        var favs = window.qaqGetReviewFavorites ? window.qaqGetReviewFavorites() : [];
        return favs.some(function (item) {
            return item.id === wordId && item.bookId === bookId;
        });
    }

    function qaqToggleFavoriteWord(wordObj) {
        var favs = window.qaqGetReviewFavorites ? window.qaqGetReviewFavorites() : [];
        var idx = favs.findIndex(function (item) {
            return item.id === wordObj.id && item.bookId === wordObj.bookId;
        });

        if (idx > -1) {
            favs.splice(idx, 1);
            if (window.qaqSaveReviewFavorites) window.qaqSaveReviewFavorites(favs);
            return false;
        } else {
            favs.unshift({
                id: wordObj.id,
                word: wordObj.word || '',
                meaning: wordObj.meaning || '',
                phonetic: wordObj.phonetic || '',
                example: wordObj.example || '',
                exampleCn: wordObj.exampleCn || '',
                bookId: wordObj.bookId || '',
                bookName: wordObj.bookName || ''
            });
            if (window.qaqSaveReviewFavorites) window.qaqSaveReviewFavorites(favs);
            return true;
        }
    }

    function qaqIsMarkedWord(bookId, wordId) {
        var marked = window.qaqGetMarkedWords ? window.qaqGetMarkedWords() : {};
        var list = marked[bookId] || [];
        return list.indexOf(wordId) > -1;
    }

    function qaqToggleMarkedWord(bookId, wordId) {
        var marked = window.qaqGetMarkedWords ? window.qaqGetMarkedWords() : {};
        if (!marked[bookId]) marked[bookId] = [];

        var idx = marked[bookId].indexOf(wordId);
        if (idx > -1) {
            marked[bookId].splice(idx, 1);
            if (!marked[bookId].length) delete marked[bookId];
            if (window.qaqSaveMarkedWords) window.qaqSaveMarkedWords(marked);
            return false;
        } else {
            marked[bookId].push(wordId);
            if (window.qaqSaveMarkedWords) window.qaqSaveMarkedWords(marked);
            return true;
        }
    }

    // 將外部共用函數暴露给 window
    window.qaqRenderReviewHome = qaqRenderReviewHome;
    window.qaqReviewSession = qaqReviewSession;
    window.qaqGetCurrentReviewSession = qaqGetCurrentReviewSession;
    window.qaqGetLastFinishedReview = qaqGetLastFinishedReview;
    window.qaqSaveCurrentReviewSession = qaqSaveCurrentReviewSession;
    window.qaqClearCurrentReviewSession = qaqClearCurrentReviewSession;
    window.qaqIsFavoriteWord = qaqIsFavoriteWord;
    window.qaqToggleFavoriteWord = qaqToggleFavoriteWord;
    window.qaqIsMarkedWord = qaqIsMarkedWord;
    window.qaqToggleMarkedWord = qaqToggleMarkedWord;

})();
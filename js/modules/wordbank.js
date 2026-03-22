(function () {
    'use strict';
    if (!window.qaqDebounce) {
        window.qaqDebounce = function (fn, delay) {
            var timer = null;
            return function () {
                var context = this;
                var args = arguments;
                clearTimeout(timer);
                timer = setTimeout(function () {
                    fn.apply(context, args);
                }, delay);
            };
        };
    }

    if (!window.qaqToggleInArray) {
        window.qaqToggleInArray = function (arr, val) {
            var idx = arr.indexOf(val);
            if (idx > -1) arr.splice(idx, 1);
            else arr.push(val);
        };
    }

    if (!window.qaqTrim) {
        window.qaqTrim = function(str) { return String(str || '').trim(); };
    }

    // ===== 补充导入控制和打断机制 =====
    if (!window.qaqImportCtrl) {
        window.qaqImportCtrl = { busy: false, activeReader: null, loadingTask: null };
    }

    if (!window.qaqIsImportCancelled) {
        window.qaqIsImportCancelled = function () {
            return false; // 后续可以再接实际的中止信号
        };
    }

    if (!window.qaqRequireImportNotCancelled) {
        window.qaqRequireImportNotCancelled = function () {
            if (window.qaqIsImportCancelled && window.qaqIsImportCancelled()) {
                throw new Error('__QAQ_IMPORT_CANCELLED__');
            }
        };
    }

    if (!window.qaqIsCancelError) {
        window.qaqIsCancelError = function(err) {
            return err && (err.message === '__QAQ_IMPORT_CANCELLED__' || err.name === 'AbortError');
        };
    }
    /* ===== Wordbank Module State ===== */
    window.qaqWordbankPage = document.getElementById('qaq-wordbank-page');
    window.qaqWordbookDetailPage = document.getElementById('qaq-wordbook-detail-page');
    window.qaqWordbankThemePage = document.getElementById('qaq-wordbank-theme-page');
    window.qaqWordbankFileInput = document.getElementById('qaq-wordbank-file-input');

    window.qaqCurrentWordbankTab = 'books';
    window.qaqCurrentWordbookId = null;

    window.qaqWordbookSelectMode = false;
    window.qaqSelectedWordbookIds = [];

    window.qaqWordEntrySelectMode = false;
    window.qaqSelectedWordIds = [];
    window.qaqCurrentImportMode = 'fast'; // fast | smart
window.qaqPendingImportType = ''; // json | excel | pdf

    /* ===== Open / Close ===== */
    window.qaqOpenWordbankPage = function () {
        window.qaqCurrentWordbankTab = 'books';
        window.qaqWordbookSelectMode = false;
        window.qaqSelectedWordbookIds = [];

        window.qaqSwitchTo(window.qaqWordbankPage);

        requestAnimationFrame(function () {
            window.qaqSwitchWordbankTab('books');
            var search = document.getElementById('qaq-wordbook-search');
            if (search) search.value = '';
            window.qaqRenderWordbookHome('');
            window.qaqApplyWordbankCardThemeDebounced();
            if (window.qaqRenderWordbankPetFloat) window.qaqRenderWordbankPetFloat();
        });
    };

    window.qaqCloseWordbankPage = function () {
        window.qaqClosePage(window.qaqWordbankPage);
    };

    window.qaqOpenWordbookDetail = function (bookId) {
        window.qaqCurrentWordbookId = bookId;
        window.qaqWordEntrySelectMode = false;
        window.qaqSelectedWordIds = [];

        window.qaqSwitchTo(window.qaqWordbookDetailPage);

        requestAnimationFrame(function () {
            var search = document.getElementById('qaq-wordbook-detail-search');
            if (search) search.value = '';
            window.qaqRenderWordbookDetail(bookId, '');
            window.qaqApplyWordbankCardThemeDebounced();
        });
    };

    window.qaqCloseWordbookDetail = function () {
        window.qaqGoBackTo(window.qaqWordbankPage, window.qaqWordbookDetailPage);
    };

    /* ===== Tab Switch ===== */
    /* ===== Tab Switch ===== */
window.qaqSwitchWordbankTab = function (tab) {
    window.qaqCurrentWordbankTab = tab;

    document.querySelectorAll('.qaq-wordbank-tab').forEach(function (el) {
        if (el.dataset.tab) {
            el.classList.toggle('qaq-wordbank-tab-active', el.dataset.tab === tab);
        }
    });

    var booksPanel = document.getElementById('qaq-wordbank-panel-books');
    var reviewPanel = document.getElementById('qaq-wordbank-panel-review');
    var minePanel = document.getElementById('qaq-wordbank-panel-mine');

    if (booksPanel) booksPanel.style.display = tab === 'books' ? '' : 'none';
    if (reviewPanel) reviewPanel.style.display = tab === 'review' ? '' : 'none';
    if (minePanel) minePanel.style.display = tab === 'mine' ? '' : 'none';

    if (tab === 'books') {
        var search = document.getElementById('qaq-wordbook-search');
        window.qaqRenderWordbookHome(search ? search.value : '');
        // 如果切回总览也需要确保桌宠存在，可以加上下面这句
        if (window.qaqRenderWordbankPetFloat) window.qaqRenderWordbankPetFloat();
    } else if (tab === 'review') {
        if (window.qaqRenderReviewHome) window.qaqRenderReviewHome();
        // 【补充这里】：在渲染完背单词主页后，调用桌宠渲染
        if (window.qaqRenderWordbankPetFloat) window.qaqRenderWordbankPetFloat();
    } else if (tab === 'mine') {
        if (window.qaqRenderMinePanel) window.qaqRenderMinePanel();
        // 如果“我的”页面也需要桌宠，同样可加上这句
        if (window.qaqRenderWordbankPetFloat) window.qaqRenderWordbankPetFloat();
    }
};
    
    window.qaqGetImportAiConfig = function () {
    var globalCfg = {};
    var reviewCfg = {};

    try {
        globalCfg = JSON.parse(localStorage.getItem('qaq-api-config') || '{}');
    } catch (e) {}

    try {
        reviewCfg = JSON.parse(localStorage.getItem('qaq-word-review-settings') || '{}');
    } catch (e) {}

    return {
        provider: reviewCfg.apiProvider || 'openai',
        url: reviewCfg.apiUrl || globalCfg.url || '',
        key: reviewCfg.apiKey || globalCfg.key || '',
        model: reviewCfg.apiModel || globalCfg.model || '',
        minimaxGroupId: reviewCfg.minimaxGroupId || ''
    };
};

window.qaqNormalizeImportAiUrl = function (url) {
    url = String(url || '').trim().replace(/\/+$/, '');
    if (!url) return '';
    if (/\/chat\/completions$/i.test(url)) return url;
    if (/\/v\d+$/i.test(url)) return url + '/chat/completions';
    return url + '/v1/chat/completions';
};

window.qaqCallImportAi = async function (cfg, prompt) {
    var url = window.qaqNormalizeImportAiUrl(cfg.url);

    var resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + cfg.key
        },
        body: JSON.stringify({
            model: cfg.model,
            messages: [
                {
                    role: 'system',
                    content: '你是一个词库数据提取助手，只返回合法 JSON，不要输出任何解释。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.1
        })
    });

    if (!resp.ok) {
        var errText = await resp.text().catch(function () { return ''; });
        throw new Error('AI 接口请求失败：' + resp.status + ' ' + errText);
    }

    var data = await resp.json();
    var content =
        (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
        (data.choices && data.choices[0] && data.choices[0].text) ||
        '';

    if (!content) {
        throw new Error('AI 返回内容为空');
    }

    return content;
};

window.qaqAiParseWordItems = async function (rawText, sourceName) {
    var cfg = window.qaqGetImportAiConfig();

    if (!cfg.key || !cfg.model || !cfg.url) {
        throw new Error('未配置智能导入所需 API');
    }

    var langCfg = window.qaqGetCurrentLangConfig();
    var prompt = langCfg.importPrompt(rawText, sourceName);

    var content = await window.qaqCallImportAi(cfg, prompt);
    var parsed = window.qaqExtractJsonBlock(content);

    if (!Array.isArray(parsed)) {
        throw new Error('AI 返回结果不是数组');
    }

    return parsed.map(function (item) {
    var rawWord = window.qaqTrim(item.word || '');
    // 强制剥离开头的数字序号（如 "1 ああ" → "ああ"，"123.abandon" → "abandon"）
    rawWord = rawWord.replace(/^\d+[\.\s、．\-]*/, '').trim();

    return {
        id: window.qaqWordId(),
        word: rawWord,
        phonetic: window.qaqTrim(item.phonetic || ''),
        meaning: window.qaqTrim(item.meaning || ''),
        example: window.qaqTrim(item.example || ''),
        exampleCn: window.qaqTrim(item.exampleCn || ''),
        book: sourceName || ''
    };
}).filter(function (item) {
    return item.word && item.meaning;
});
};

    /* ===== Helpers ===== */
    window.qaqFormatImportTime = function (ts) {
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

    window.qaqIsPureIndexLine = function (text) {
        return /^\d+$/.test(window.qaqTrim(text));
    };

    window.qaqLooksLikeWordHeader = function (text) {
        text = window.qaqTrim(text).toLowerCase();
        return text === 'word' || text === '单词';
    };

    window.qaqLooksLikeMeaningHeader = function (text) {
        text = window.qaqTrim(text).toLowerCase();
        return text === 'meaning' || text === '释义' || text === '中文' || text === 'translation';
    };

    window.qaqLooksLikeNoiseLine = function (text) {
        text = window.qaqTrim(text);
        if (!text) return true;

        if (/^---page\s+\d+/i.test(text)) return true;
        if (/^2025四级词汇闪过/.test(text)) return true;
        if (/^共\s*\d+\s*词/.test(text)) return true;
        if (/^扫码听单词/.test(text)) return true;
        if (/^纸上默写/.test(text)) return true;
        if (/^word\s*meaning$/i.test(text)) return true;

        return false;
    };

    window.qaqLooksLikePosLine = function (text) {
        text = window.qaqTrim(text).toLowerCase();

        return /^(n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux|modal|det)\.$/.test(text) ||
               /^(n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux|modal|det)\./.test(text) ||
               /^(n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux|modal|det)\b/.test(text);
    };
    
    /* ===== 多语言词库配置 ===== */
window.qaqWordbankLangConfig = {
    en: {
        name: '英语',
        flag: '🇬🇧',
        wordLabel: '单词',
        meaningLabel: '释义',
        phoneticLabel: '音标',
        exampleLabel: '例句',
        ttsLang: 'en-US',
        importPrompt: function (rawText, sourceName) {
            return '请从以下词库原始文本中尽可能准确提取英语单词信息，并且只返回 JSON 数组，不要返回任何解释、不要 markdown。\n\n' +
                '要求：\n' +
                '1. 自动识别 OCR 打乱、错行、断行、跨行、混排内容。\n' +
                '2. 尽量提取字段：word, phonetic, meaning, example, exampleCn。\n' +
                '3. 没有的字段填空字符串。\n' +
                '4. 自动过滤页码、标题、宣传语、无意义文本。\n' +
                '5. 一个词若有多个释义，可以合并到 meaning。\n' +
                '6. 只返回 JSON 数组。\n\n' +
                '格式示例：\n' +
                '[\n' +
                '  {\n' +
                '    "word": "abandon",\n' +
                '    "phonetic": "/əˈbændən/",\n' +
                '    "meaning": "vt. 放弃；抛弃",\n' +
                '    "example": "",\n' +
                '    "exampleCn": ""\n' +
                '  }\n' +
                ']\n\n' +
                '原始文本如下：\n' + rawText;
        },
        studyDataPrompt: function (wordObj) {
            return '请为下面这个英语单词补全学习信息，并只返回 JSON，不要返回多余解释。\n' +
                '单词：' + wordObj.word + '\n' +
                '已知释义：' + (wordObj.meaning || '无') + '\n\n' +
                '返回格式：\n' +
                '{\n' +
                '  "phonetic": "音标",\n' +
                '  "example": "简短英文例句",\n' +
                '  "exampleCn": "例句中文翻译",\n' +
                '  "petMsgKnown": "答对时桌宠夸奖的话，简短温柔",\n' +
                '  "petMsgVague": "有点印象时桌宠鼓励的话，简短温柔",\n' +
                '  "petMsgUnknown": "不认识时桌宠安慰的话，简短温柔"\n' +
                '}\n\n' +
                '要求：\n' +
                '1. 音标尽量标准\n' +
                '2. 例句自然、简短，适合四六级学习\n' +
                '3. 中文翻译准确\n' +
                '4. 桌宠话术中文输出，语气温柔可爱但不要太夸张\n' +
                '5. 三句桌宠话术都要不同\n' +
                '6. 只返回 JSON';
        },
        looksLikeWord: function (text) {
            text = window.qaqTrim(text);
            if (!text) return false;
            var lower = text.toLowerCase();
            if (window.qaqLooksLikeWordHeader(text) || window.qaqLooksLikeMeaningHeader(text)) return false;
            if (window.qaqLooksLikeNoiseLine(text)) return false;
            if (window.qaqIsPureIndexLine(text)) return false;
            if (window.qaqLooksLikePosLine(text)) return false;
            if (!/^[A-Za-z][A-Za-z\s\-'\.\/()]{0,50}$/.test(text)) return false;
            if (text.length > 40) return false;
            if (lower === 'a' || lower === 'i') return false;
            return true;
        },
        looksLikeMeaning: function (text) {
            text = window.qaqTrim(text);
            if (!text) return false;
            if (window.qaqLooksLikeWordHeader(text) || window.qaqLooksLikeMeaningHeader(text)) return false;
            if (window.qaqLooksLikeNoiseLine(text)) return false;
            if (window.qaqIsPureIndexLine(text)) return false;
            if (window.qaqLooksLikePosLine(text) && /[\u4e00-\u9fa5]/.test(text)) return true;
            return /[\u4e00-\u9fa5]/.test(text);
        },
        validateWord: function (word, meaning) {
            word = window.qaqTrim(word);
            meaning = window.qaqTrim(meaning);
            if (!word && !meaning) return { ok: false, reason: '单词和释义都为空' };
            if (!word) return { ok: false, reason: '单词为空' };
            if (!meaning) return { ok: false, reason: '释义为空' };
            if (window.qaqShouldDropWordItem(word, meaning)) return { ok: false, reason: '疑似标题、页码或无效内容' };
            var langCfg = window.qaqWordbankLangConfig['en'];
            if (!langCfg.looksLikeWord(word)) return { ok: false, reason: '单词格式未通过校验' };
            if (meaning.length > 800) return { ok: false, reason: '释义过长，疑似混入杂项文本' };
            return { ok: true, reason: '' };
        }
    },
    ja: {
        name: '日语',
        flag: '🇯🇵',
        wordLabel: '假名/汉字',
        meaningLabel: '释义',
        phoneticLabel: '读音',
        exampleLabel: '例句',
        ttsLang: 'ja-JP',
        importPrompt: function (rawText, sourceName) {
            return '请从以下词库原始文本中尽可能准确提取日语单词信息，并且只返回 JSON 数组，不要返回任何解释、不要 markdown。\n\n' +
                '要求：\n' +
                '1. 自动识别 OCR 打乱、错行、断行、跨行、混排内容。\n' +
                '2. 尽量提取字段：word（日语假名或汉字写法）, phonetic（平假名读音）, meaning（中文释义）, example（日文例句）, exampleCn（例句中文翻译）。\n' +
                '3. 如果原文中有汉字写法，word 填汉字写法，phonetic 填假名读音。如果只有假名，word 填假名，phonetic 可留空。\n' +
                '4. 没有的字段填空字符串。\n' +
                '5. 自动过滤页码、标题、宣传语、无意义文本。\n' +
                '6. 一个词若有多个释义，可以合并到 meaning。\n' +
                '7. 如果原文包含词性标注（如 名、动1自、形1 等），请将词性信息放到 meaning 开头。\n' +
                '8. word 字段中不要包含序号数字，只保留纯假名或汉字。如果原文是 "1 ああ"，word 应该是 "ああ" 而不是 "1 ああ"。\n' +
'9. 只返回 JSON 数组。\n\n' +
                '格式示例：\n' +
                '[\n' +
                '  {\n' +
                '    "word": "愛",\n' +
                '    "phonetic": "あい",\n' +
                '    "meaning": "名・动3他 爱；爱情",\n' +
                '    "example": "彼女を愛している。",\n' +
                '    "exampleCn": "我爱她。"\n' +
                '  },\n' +
                '  {\n' +
                '    "word": "あいさつ",\n' +
                '    "phonetic": "",\n' +
                '    "meaning": "名・动3自 寒暄；问候；致辞",\n' +
                '    "example": "朝のあいさつをする。",\n' +
                '    "exampleCn": "进行早上的问候。"\n' +
                '  }\n' +
                ']\n\n' +
                '原始文本如下：\n' + rawText;
        },
        studyDataPrompt: function (wordObj) {
            return '请为下面这个日语单词补全学习信息，并只返回 JSON，不要返回多余解释。\n' +
                '单词：' + wordObj.word + '\n' +
                '读音：' + (wordObj.phonetic || '无') + '\n' +
                '已知释义：' + (wordObj.meaning || '无') + '\n\n' +
                '返回格式：\n' +
                '{\n' +
                '  "phonetic": "平假名读音（如果已有可保留）",\n' +
                '  "example": "简短日文例句",\n' +
                '  "exampleCn": "例句中文翻译",\n' +
                '  "petMsgKnown": "答对时桌宠夸奖的话，简短温柔，中文",\n' +
                '  "petMsgVague": "有点印象时桌宠鼓励的话，简短温柔，中文",\n' +
                '  "petMsgUnknown": "不认识时桌宠安慰的话，简短温柔，中文"\n' +
                '}\n\n' +
                '要求：\n' +
                '1. 如果单词已有读音(phonetic)则保留原值\n' +
                '2. 例句自然、简短，适合 N5-N3 日语学习\n' +
                '3. 中文翻译准确\n' +
                '4. 桌宠话术用中文输出，语气温柔可爱\n' +
                '5. 三句桌宠话术都要不同\n' +
                '6. 只返回 JSON';
        },
        looksLikeWord: function (text) {
    text = window.qaqTrim(text);
    if (!text) return false;
    if (window.qaqIsPureIndexLine(text)) return false;
    if (window.qaqLooksLikeNoiseLine(text)) return false;
    
    // 【新增】排除 JLPT 等级标签
    if (/^N[1-5]$/.test(text)) return false;
    
    // 【新增】排除词性标注行
    if (/^(名|动[1-3]?[自他]?|形[12]?|副|连体|感|接|后缀|前缀)(・(名|动[1-3]?[自他]?|形[12]?|副|连体|感|接|后缀|前缀))*$/.test(text)) return false;
    
    // 【新增】排除分类标签
    if (/^(实义词汇|非实义词汇|抽象概念|动作与行为|状态与性质|人物与人际|自然与地理|空间与方向|身体与健康|服装与物品|建筑与场所|社会与经济|科技与媒体|交通与旅行|程度与频率|饮食|语言与沟通|教育与学习|文化.*娱乐|时间|感叹词|连接词|指示词.*疑问词|接头词.*接尾词|其他功能词)$/.test(text)) return false;

    // 日语单词：包含平假名、片假名或日语汉字
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return true;
    // 纯汉字也可能是日语单词（需结合上下文）
    if (/^[\u4e00-\u9faf\u3400-\u4dbf]+$/.test(text) && text.length <= 6) return true;
    // 外来语片假名
    if (/^[\u30A0-\u30FF\u30FC]+$/.test(text)) return true;
    return false;
},
        looksLikeMeaning: function (text) {
    text = window.qaqTrim(text);
    if (!text) return false;
    if (window.qaqIsPureIndexLine(text)) return false;
    if (window.qaqLooksLikeNoiseLine(text)) return false;
    
    // 【新增】排除 JLPT 等级标签
    if (/^N[1-5]$/.test(text)) return false;
    
    // 【新增】排除词性标注行
    if (/^(名|动[1-3]?[自他]?|形[12]?|副|连体|感|接|后缀|前缀)(・(名|动[1-3]?[自他]?|形[12]?|副|连体|感|接|后缀|前缀))*$/.test(text)) return false;
    
    // 【新增】排除分类标签（这些虽然包含汉字，但不是释义）
    if (/^(实义词汇|非实义词汇|抽象概念|动作与行为|状态与性质|人物与人际|自然与地理|空间与方向|身体与健康|服装与物品|建筑与场所|社会与经济|科技与媒体|交通与旅行|程度与频率|饮食|语言与沟通|教育与学习|文化.*娱乐|时间|感叹词|连接词|指示词.*疑问词|接头词.*接尾词|其他功能词)$/.test(text)) return false;
    
    // 中文释义
    return /[\u4e00-\u9fa5]/.test(text);
},
        validateWord: function (word, meaning) {
            word = window.qaqTrim(word);
            meaning = window.qaqTrim(meaning);
            if (!word && !meaning) return { ok: false, reason: '单词和释义都为空' };
            if (!word) return { ok: false, reason: '单词为空' };
            if (!meaning) return { ok: false, reason: '释义为空' };
            if (window.qaqShouldDropWordItem(word, meaning)) return { ok: false, reason: '疑似标题、页码或无效内容' };
            if (meaning.length > 800) return { ok: false, reason: '释义过长' };
            return { ok: true, reason: '' };
        }
    }
};

window.qaqGetCurrentLangConfig = function () {
    var lang = window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en';
    return window.qaqWordbankLangConfig[lang] || window.qaqWordbankLangConfig['en'];
};

    window.qaqLooksLikeEnglishWord = function (text) {
    var lang = window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en';
    var langCfg = window.qaqWordbankLangConfig[lang];
    if (langCfg && langCfg.looksLikeWord) {
        return langCfg.looksLikeWord(text);
    }
    // 原始英语兜底
    text = window.qaqTrim(text);
    if (!text) return false;
    if (!/^[A-Za-z][A-Za-z\s\-'\.\/()]{0,50}$/.test(text)) return false;
    if (text.length > 40) return false;
    return true;
};

    window.qaqLooksLikeChineseMeaning = function (text) {
    var lang = window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en';
    var langCfg = window.qaqWordbankLangConfig[lang];
    if (langCfg && langCfg.looksLikeMeaning) {
        return langCfg.looksLikeMeaning(text);
    }
    text = window.qaqTrim(text);
    if (!text) return false;
    return /[\u4e00-\u9fa5]/.test(text);
};

    window.qaqShouldDropWordItem = function (word, meaning) {
        var w = window.qaqTrim(word).toLowerCase();
        var m = window.qaqTrim(meaning).toLowerCase();

        if (!w || !m) return true;

        if ((w === 'word' && m === 'meaning') ||
            (window.qaqLooksLikeWordHeader(w) && window.qaqLooksLikeMeaningHeader(m))) {
            return true;
        }

        if (window.qaqLooksLikeNoiseLine(word) || window.qaqLooksLikeNoiseLine(meaning)) return true;
        if (window.qaqIsPureIndexLine(word) || window.qaqIsPureIndexLine(meaning)) return true;

        return false;
    };

    window.qaqNormalizeWordItem = function (raw, bookName) {
        var word = window.qaqTrim(raw.word || raw.en || raw.english || raw.term || raw.vocab || '');
// 剥离开头的数字序号
word = word.replace(/^\d+[\.\s、．\-]*/, '').trim();
        var meaning = window.qaqTrim(raw.meaning || raw.cn || raw.chinese || raw.translation || raw.desc || '');
        var phonetic = window.qaqTrim(raw.phonetic || raw.uk || raw.us || '');
        var example = window.qaqTrim(raw.example || raw.sentence || '');
        var exampleCn = window.qaqTrim(raw.exampleCn || raw.sentenceCn || raw.example_cn || '');

        if (!word && !meaning) return null;

        return {
            id: raw.id || window.qaqWordId(),
            word: word,
            meaning: meaning,
            phonetic: phonetic,
            example: example,
            exampleCn: exampleCn,
            book: raw.book || bookName || ''
        };
    };

    window.qaqDedupeWordItems = function (items) {
        var seen = {};
        return items.filter(function (item) {
            var key = (window.qaqTrim(item.word).toLowerCase() + '||' + window.qaqTrim(item.meaning));
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
    };

    window.qaqCreateWordbook = function (name, words, sourceName) {
    return {
        id: window.qaqWordbookId(),
        name: name || '未命名词库',
        color: '#5b9bd5',
        importedAt: Date.now(),
        sourceName: sourceName || '',
        lang: window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en',
        words: words.map(function (item) {
            return {
                id: item.id || window.qaqWordId(),
                word: item.word || '',
                meaning: item.meaning || '',
                phonetic: item.phonetic || '',
                example: item.example || '',
                exampleCn: item.exampleCn || ''
            };
        })
    };
};

    /* ===== Validation / Classification ===== */
   window.qaqValidateWordCandidate = function (word, meaning) {
    var lang = window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en';
    var langCfg = window.qaqWordbankLangConfig[lang];
    if (langCfg && langCfg.validateWord) {
        return langCfg.validateWord(word, meaning);
    }
    // 兜底
    word = window.qaqTrim(word);
    meaning = window.qaqTrim(meaning);
    if (!word && !meaning) return { ok: false, reason: '单词和释义都为空' };
    if (!word) return { ok: false, reason: '单词为空' };
    if (!meaning) return { ok: false, reason: '释义为空' };
    return { ok: true, reason: '' };
};

    window.qaqDedupeWordItemsWithLog = function (items) {
        var seen = {};
        var accepted = [];
        var rejected = [];

        items.forEach(function (item) {
            var key = (window.qaqTrim(item.word).toLowerCase() + '||' + window.qaqTrim(item.meaning));
            if (seen[key]) {
                rejected.push({
                    word: item.word || '',
                    meaning: item.meaning || '',
                    reason: '重复词条'
                });
                return;
            }
            seen[key] = true;
            accepted.push(item);
        });

        return {
            accepted: accepted,
            rejected: rejected
        };
    };

    window.qaqClassifyWordCandidates = function (items) {
    var accepted = [];
    var rejected = [];

    var lang = window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en';
    var langCfg = window.qaqWordbankLangConfig ? window.qaqWordbankLangConfig[lang] : null;

    (items || []).forEach(function (item) {
        var word = window.qaqTrim(item.word || '');
        var meaning = window.qaqTrim(item.meaning || '');

        // 使用当前语言的验证器
        var check;
        if (langCfg && langCfg.validateWord) {
            check = langCfg.validateWord(word, meaning);
        } else {
            check = window.qaqValidateWordCandidate(word, meaning);
        }

        if (!check.ok) {
            rejected.push({
                word: word,
                meaning: meaning,
                reason: check.reason
            });
            return;
        }

        accepted.push({
            id: item.id || window.qaqWordId(),
            word: word,
            meaning: meaning,
            phonetic: item.phonetic || '',
            example: item.example || '',
            exampleCn: item.exampleCn || '',
            book: item.book || ''
        });
    });

    var deduped = window.qaqDedupeWordItemsWithLog(accepted);

    return {
        accepted: deduped.accepted,
        rejected: rejected.concat(deduped.rejected)
    };
};

    /* ===== Render Wordbook Home ===== */
    window.qaqRenderWordbookHome = function (keyword) {
    var listEl = document.getElementById('qaq-wordbook-list');
    var statsEl = document.getElementById('qaq-wordbook-stats');
    var emptyEl = document.getElementById('qaq-wordbook-empty');
    var batchBar = document.getElementById('qaq-wordbook-batchbar');
    if (!listEl) return;

    var books = window.qaqGetWordbooks();
    var currentLang = window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en';
    books = books.filter(function (book) {
        // 没有 lang 字段的老词库默认当作英语
        var bookLang = book.lang || 'en';
        return bookLang === currentLang;
    });
    var kw = (keyword || '').trim().toLowerCase();

    if (kw) {
        books = books.filter(function (book) {
            return (book.name || '').toLowerCase().indexOf(kw) > -1;
        });
    }

    statsEl.textContent = '共 ' + books.length + ' 本' +
        (window.qaqWordbookSelectMode ? ' · 已选 ' + window.qaqSelectedWordbookIds.length + ' 本' : '');

    if (batchBar) batchBar.style.display = window.qaqWordbookSelectMode ? 'flex' : 'none';

    if (!books.length) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    window._qaqHomeAllBooks = books;
    window._qaqHomeRendered = 0;

    listEl.innerHTML = '';
    _qaqHomeAppendBatch(listEl, 30);

    var scrollContainer = listEl.closest('.qaq-wordbank-content') || listEl.closest('.qaq-wordbank-panel');
    if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', _qaqHomeScrollHandler);
        scrollContainer.addEventListener('scroll', _qaqHomeScrollHandler);
    }
};

function _qaqHomeScrollHandler(e) {
    var el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        var listEl = document.getElementById('qaq-wordbook-list');
        if (listEl && window._qaqHomeAllBooks && window._qaqHomeRendered < window._qaqHomeAllBooks.length) {
            _qaqHomeAppendBatch(listEl, 30);
        }
    }
}

function _qaqHomeAppendBatch(listEl, batchSize) {
    var books = window._qaqHomeAllBooks || [];
    var start = window._qaqHomeRendered || 0;
    var end = Math.min(start + batchSize, books.length);

    var frag = document.createDocumentFragment();

    for (var i = start; i < end; i++) {
        var book = books[i];
        var selected = window.qaqSelectedWordbookIds.indexOf(book.id) > -1;
        var div = document.createElement('div');
        div.className = 'qaq-wordbook-card' + (selected ? ' qaq-card-selected' : '');
        div.dataset.bookId = book.id;
        var bookColor = book.color || '#5b9bd5';

        if (window.qaqWordbookSelectMode) {
            div.innerHTML =
                '<div class="qaq-wordbook-card-top">' +
                    '<div class="qaq-select-check' + (selected ? ' qaq-select-check-on' : '') + '"></div>' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div style="display:flex;align-items:center;gap:8px;">' +
                            '<div style="width:10px;height:10px;border-radius:50%;background:' + bookColor + ';flex-shrink:0;"></div>' +
                            '<div class="qaq-wordbook-card-name">' + book.name + '</div>' +
                        '</div>' +
                        '<div class="qaq-wordbook-card-meta">导入：' + window.qaqFormatImportTime(book.importedAt) + '</div>' +
                        '<div class="qaq-wordbook-card-count">共 ' + (book.words ? book.words.length : 0) + ' 条</div>' +
                    '</div>' +
                '</div>';
        } else {
            div.innerHTML =
                '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<div style="width:10px;height:10px;border-radius:50%;background:' + bookColor + ';"></div>' +
                    '<div class="qaq-wordbook-card-name">' + book.name + '</div>' +
                '</div>' +
                '<div class="qaq-wordbook-card-meta">导入：' + window.qaqFormatImportTime(book.importedAt) + '</div>' +
                '<div class="qaq-wordbook-card-count">共 ' + (book.words ? book.words.length : 0) + ' 条</div>';
        }

        frag.appendChild(div);
    }

    listEl.appendChild(frag);
    window._qaqHomeRendered = end;
}

    /* ===== Render Wordbook Detail ===== */
    window.qaqRenderWordbookDetail = function (bookId, keyword) {
    var books = window.qaqGetWordbooks();
    var book = books.find(function (b) { return b.id === bookId; });
    if (!book) return;

    var titleEl = document.getElementById('qaq-wordbook-detail-title');
    if (titleEl) titleEl.textContent = book.name;

    var listEl = document.getElementById('qaq-wordbook-detail-list');
    var statsEl = document.getElementById('qaq-wordbook-detail-stats');
    var emptyEl = document.getElementById('qaq-wordbook-detail-empty');
    var batchBar = document.getElementById('qaq-word-entry-batchbar');

    var items = book.words || [];
    var kw = (keyword || '').trim().toLowerCase();

    if (kw) {
        items = items.filter(function (item) {
            return (item.word || '').toLowerCase().indexOf(kw) > -1 ||
                (item.meaning || '').toLowerCase().indexOf(kw) > -1;
        });
    }

    if (statsEl) {
        statsEl.textContent = '共 ' + items.length + ' 条' +
            (window.qaqWordEntrySelectMode ? ' · 已选 ' + window.qaqSelectedWordIds.length + ' 条' : '');
    }

    if (batchBar) batchBar.style.display = window.qaqWordEntrySelectMode ? 'flex' : 'none';

    if (!items.length) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    // 存储完整列表供滚动加载使用
    window._qaqDetailAllItems = items;
    window._qaqDetailRendered = 0;

    listEl.innerHTML = '';
    _qaqDetailAppendBatch(listEl, 50);

    // 移除旧的滚动监听，避免重复绑定
    var scrollContainer = listEl.closest('.qaq-wordbook-detail-content');
    if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', _qaqDetailScrollHandler);
        scrollContainer.addEventListener('scroll', _qaqDetailScrollHandler);
    }
};

function _qaqDetailScrollHandler(e) {
    var el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        var listEl = document.getElementById('qaq-wordbook-detail-list');
        if (listEl && window._qaqDetailAllItems && window._qaqDetailRendered < window._qaqDetailAllItems.length) {
            _qaqDetailAppendBatch(listEl, 50);
        }
    }
}

function _qaqDetailAppendBatch(listEl, batchSize) {
    var items = window._qaqDetailAllItems || [];
    var start = window._qaqDetailRendered || 0;
    var end = Math.min(start + batchSize, items.length);

    var frag = document.createDocumentFragment();

    for (var i = start; i < end; i++) {
        var item = items[i];
        var selected = window.qaqSelectedWordIds.indexOf(item.id) > -1;
        var div = document.createElement('div');
        div.className = 'qaq-word-entry-card' + (selected ? ' qaq-card-selected' : '');
        div.dataset.wordId = item.id;

        if (window.qaqWordEntrySelectMode) {
            div.innerHTML =
                '<div class="qaq-word-entry-card-top">' +
                    '<div class="qaq-select-check' + (selected ? ' qaq-select-check-on' : '') + '"></div>' +
                    '<div class="qaq-word-entry-main">' +
                        '<div class="qaq-word-entry-word">' + item.word + '</div>' +
                        '<div class="qaq-word-entry-meaning">' + item.meaning + '</div>' +
                    '</div>' +
                '</div>';
        } else {
            div.innerHTML =
                '<div class="qaq-word-entry-main">' +
                    '<div class="qaq-word-entry-word">' + item.word + '</div>' +
                    '<div class="qaq-word-entry-meaning">' + item.meaning + '</div>' +
                '</div>' +
                '<div class="qaq-word-entry-actions">' +
                    '<button class="qaq-word-entry-btn qaq-word-entry-btn-edit" data-id="' + item.id + '">✎</button>' +
                    '<button class="qaq-word-entry-btn qaq-word-entry-btn-del" data-id="' + item.id + '">✕</button>' +
                '</div>';
        }

        frag.appendChild(div);
    }

    listEl.appendChild(frag);
    window._qaqDetailRendered = end;

    // 更新底部提示
    var oldTip = listEl.querySelector('.qaq-load-more-tip');
    if (oldTip) oldTip.remove();

    if (end < items.length) {
        var tip = document.createElement('div');
        tip.className = 'qaq-load-more-tip';
        tip.textContent = '已加载 ' + end + ' / ' + items.length + ' 条，继续下滑加载更多';
        listEl.appendChild(tip);
    } else if (items.length > 50) {
        var doneTip = document.createElement('div');
        doneTip.className = 'qaq-load-more-tip';
        doneTip.textContent = '全部 ' + items.length + ' 条已加载完毕';
        listEl.appendChild(doneTip);
    }
}

    /* ===== Edit Wordbook Meta ===== */
    window.qaqEditWordbookMeta = function (bookId) {
        var books = window.qaqGetWordbooks();
        var book = books.find(function (b) { return b.id === bookId; });
        if (!book) return;

        var currentColor = book.color || '#5b9bd5';
        var colorsHtml = '';

        window.qaqPlanColors.forEach(function (c) {
            var sel = c.toLowerCase() === currentColor.toLowerCase();
            colorsHtml += '<div class="qaq-plan-color-option' + (sel ? ' qaq-color-selected' : '') +
                '" data-color="' + c + '" style="background:' + c + ';"></div>';
        });

        colorsHtml += '<div class="qaq-color-custom-btn" id="qaq-wordbook-color-custom"></div>';

        window.qaqModalTitle.textContent = '编辑词库';
        window.qaqModalBody.innerHTML =
            '<div class="qaq-plan-form">' +
                '<div class="qaq-plan-form-label">词库名称</div>' +
                '<input class="qaq-plan-form-input" id="qaq-wordbook-edit-name" type="text" value="' + (book.name || '').replace(/"/g, '&quot;') + '">' +
                '<div class="qaq-plan-form-label">词库颜色</div>' +
                '<div class="qaq-plan-color-picker" id="qaq-wordbook-edit-colors">' + colorsHtml + '</div>' +
                '<div class="qaq-color-panel" id="qaq-wordbook-color-panel"></div>' +
            '</div>';

        window.qaqModalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">保存</button>';

        window.qaqOpenModal();

        var selectedColor = currentColor;
        var picker = document.getElementById('qaq-wordbook-edit-colors');
        var panel = document.getElementById('qaq-wordbook-color-panel');
        var customBtn = document.getElementById('qaq-wordbook-color-custom');

        picker.addEventListener('click', function (e) {
            var option = e.target.closest('.qaq-plan-color-option');
            if (option) {
                picker.querySelectorAll('.qaq-plan-color-option').forEach(function (el) {
                    el.classList.remove('qaq-color-selected');
                });
                customBtn.classList.remove('qaq-color-selected');
                option.classList.add('qaq-color-selected');
                selectedColor = option.dataset.color;
                panel.classList.remove('qaq-color-panel-show');
                return;
            }

            if (e.target.closest('.qaq-color-custom-btn')) {
                picker.querySelectorAll('.qaq-plan-color-option').forEach(function (el) {
                    el.classList.remove('qaq-color-selected');
                });
                customBtn.classList.add('qaq-color-selected');

                if (panel.classList.contains('qaq-color-panel-show')) {
                    panel.classList.remove('qaq-color-panel-show');
                } else {
                    panel.classList.add('qaq-color-panel-show');
                    window.qaqCreateColorPicker(panel, selectedColor, function (hex) {
                        selectedColor = hex;
                        customBtn.style.background = hex;
                        panel.classList.remove('qaq-color-panel-show');
                    }, function () {
                        panel.classList.remove('qaq-color-panel-show');
                        customBtn.classList.remove('qaq-color-selected');
                    });
                }
            }
        });

        document.getElementById('qaq-modal-cancel').onclick = window.qaqCloseModal;
        document.getElementById('qaq-modal-confirm').onclick = function () {
            var newName = document.getElementById('qaq-wordbook-edit-name').value.trim();
            if (!newName) return window.qaqToast('请输入词库名称');

            book.name = newName;
            book.color = selectedColor;

            window.qaqSaveWordbooks(books);
            window.qaqCloseModal();

            var detailTitle = document.getElementById('qaq-wordbook-detail-title');
            if (detailTitle) detailTitle.textContent = newName;

            var search = document.getElementById('qaq-wordbook-search');
            window.qaqRenderWordbookHome(search ? search.value : '');

            if (window.qaqCurrentWordbookId) {
                var detailSearch = document.getElementById('qaq-wordbook-detail-search');
                window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, detailSearch ? detailSearch.value : '');
            }

            window.qaqToast('词库已更新');
        };
    };

    /* ===== Add / Edit / Delete Word Entry ===== */
    window.qaqAddWordEntryToCurrentBook = function () {
        if (!window.qaqCurrentWordbookId) return;

        window.qaqModalTitle.textContent = '新增词条';
        window.qaqModalBody.innerHTML =
            '<div class="qaq-plan-form">' +
                '<div class="qaq-plan-form-label">单词</div>' +
                '<input class="qaq-plan-form-input" id="qaq-word-entry-word" type="text" placeholder="输入单词">' +
                '<div class="qaq-plan-form-label">释义</div>' +
                '<textarea class="qaq-plan-form-textarea" id="qaq-word-entry-meaning" placeholder="输入释义"></textarea>' +
            '</div>';

        window.qaqModalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">添加</button>';

        window.qaqOpenModal();

        document.getElementById('qaq-modal-cancel').onclick = window.qaqCloseModal;
        document.getElementById('qaq-modal-confirm').onclick = function () {
            var newWord = document.getElementById('qaq-word-entry-word').value.trim();
            var newMeaning = document.getElementById('qaq-word-entry-meaning').value.trim();
            if (!newWord || !newMeaning) return window.qaqToast('请填写完整');

            var books = window.qaqGetWordbooks();
            var book = books.find(function (b) { return b.id === window.qaqCurrentWordbookId; });
            if (!book) return;

            book.words.unshift({
                id: window.qaqWordId(),
                word: newWord,
                meaning: newMeaning,
                phonetic: '',
                example: '',
                exampleCn: ''
            });

            window.qaqSaveWordbooks(books);
            window.qaqCloseModal();

            var detailSearch = document.getElementById('qaq-wordbook-detail-search');
            window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, detailSearch ? detailSearch.value : '');

            var homeSearch = document.getElementById('qaq-wordbook-search');
            setTimeout(function () {
                window.qaqRenderWordbookHome(homeSearch ? homeSearch.value : '');
            }, 280);

            window.qaqToast('已添加');
        };
    };

    window.qaqEditWordEntry = function (bookId, wordId) {
        var books = window.qaqGetWordbooks();
        var book = books.find(function (b) { return b.id === bookId; });
        if (!book) return;

        var item = (book.words || []).find(function (w) { return w.id === wordId; });
        if (!item) return;

        window.qaqModalTitle.textContent = '编辑词条';
        window.qaqModalBody.innerHTML =
            '<div class="qaq-plan-form">' +
                '<div class="qaq-plan-form-label">单词</div>' +
                '<input class="qaq-plan-form-input" id="qaq-word-entry-word" type="text" value="' + String(item.word).replace(/"/g, '&quot;') + '">' +
                '<div class="qaq-plan-form-label">释义</div>' +
                '<textarea class="qaq-plan-form-textarea" id="qaq-word-entry-meaning">' + item.meaning + '</textarea>' +
            '</div>';

        window.qaqModalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">保存</button>';

        window.qaqOpenModal();

        document.getElementById('qaq-modal-cancel').onclick = window.qaqCloseModal;
        document.getElementById('qaq-modal-confirm').onclick = function () {
            var newWord = document.getElementById('qaq-word-entry-word').value.trim();
            var newMeaning = document.getElementById('qaq-word-entry-meaning').value.trim();
            if (!newWord || !newMeaning) return window.qaqToast('请填写完整');

            item.word = newWord;
            item.meaning = newMeaning;
            window.qaqSaveWordbooks(books);
            window.qaqCloseModal();

            var detailSearch = document.getElementById('qaq-wordbook-detail-search');
            window.qaqRenderWordbookDetail(bookId, detailSearch ? detailSearch.value : '');

            var homeSearch = document.getElementById('qaq-wordbook-search');
            setTimeout(function () {
                window.qaqRenderWordbookHome(homeSearch ? homeSearch.value : '');
            }, 280);

            window.qaqToast('已保存');
        };
    };

    window.qaqDeleteWordEntry = function (bookId, wordId) {
        window.qaqConfirm('删除词条', '确认删除这条词条吗？', function () {
            var books = window.qaqGetWordbooks();
            var book = books.find(function (b) { return b.id === bookId; });
            if (!book) return;

            var idx = (book.words || []).findIndex(function (w) { return w.id === wordId; });
            if (idx > -1) {
                book.words.splice(idx, 1);
                window.qaqSaveWordbooks(books);

                var detailSearch = document.getElementById('qaq-wordbook-detail-search');
                window.qaqRenderWordbookDetail(bookId, detailSearch ? detailSearch.value : '');

                window.qaqToast('已删除');
            }
        });
    };

    /* ===== Export ===== */
    window.qaqExportWordbooks = function () {
    var currentLang = window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en';
    var data = window.qaqGetWordbooks().filter(function (b) {
        return (b.lang || 'en') === currentLang;
    });
    if (!data.length) return window.qaqToast('当前语言暂无词库');

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'qaq-wordbooks-' + currentLang + '.json';
    a.click();
    URL.revokeObjectURL(url);
    window.qaqToast('已导出 JSON');
};

    window.qaqExportSelectedWordbooks = function (ids) {
        var books = window.qaqGetWordbooks().filter(function (b) {
            return ids.indexOf(b.id) > -1;
        });
        if (!books.length) return window.qaqToast('请先选择词库');

        var blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'qaq-wordbooks-selected.json';
        a.click();
        URL.revokeObjectURL(url);
        window.qaqToast('已导出所选词库');
    };

    /* ===== Import Review Modal ===== */
    window.qaqOpenWordbookImportReview = function (bookName, acceptedItems, rejectedItems, sourceName) {
        acceptedItems = acceptedItems || [];
        rejectedItems = rejectedItems || [];

        var acceptedHtml = acceptedItems.slice(0, 20).map(function (item) {
            return (
                '<div class="qaq-wordbank-preview-item">' +
                    '<div class="qaq-wordbank-preview-item-top">' +
                        '<div class="qaq-wordbank-preview-word">' + item.word + '</div>' +
                    '</div>' +
                    '<div class="qaq-wordbank-preview-meaning">' + item.meaning + '</div>' +
                '</div>'
            );
        }).join('');

        var rejectedHtml = rejectedItems.slice(0, 80).map(function (item, idx) {
            return (
                '<label class="qaq-wordbank-preview-item" style="cursor:pointer;">' +
                    '<div style="display:flex;align-items:flex-start;gap:8px;">' +
                        '<input type="checkbox" class="qaq-import-reject-check" data-idx="' + idx + '" style="margin-top:2px;">' +
                        '<div style="flex:1;min-width:0;">' +
                            '<div class="qaq-wordbank-preview-item-top">' +
                                '<div class="qaq-wordbank-preview-word">' + (item.word || '（空）') + '</div>' +
                            '</div>' +
                            '<div class="qaq-wordbank-preview-meaning">' + (item.meaning || '（空）') + '</div>' +
                            '<div class="qaq-wordbank-preview-meta" style="color:#d27a7a;">未导入原因：' + item.reason + '</div>' +
                        '</div>' +
                    '</div>' +
                '</label>'
            );
        }).join('');

        window.qaqModalTitle.textContent = '导入检查';
        window.qaqModalBody.innerHTML =
            '<div class="qaq-wordbank-preview-wrap">' +
                '<input class="qaq-modal-input" id="qaq-wordbook-name-input" type="text" value="' + bookName.replace(/"/g, '&quot;') + '">' +
                '<div class="qaq-wordbank-preview-desc">自动识别成功 ' + acceptedItems.length + ' 条</div>' +
                '<div class="qaq-wordbank-preview-list">' + acceptedHtml + '</div>' +
                (acceptedItems.length > 20 ? '<div class="qaq-wordbank-preview-note">仅显示前 20 条自动识别结果</div>' : '') +
                '<div class="qaq-wordbank-preview-desc" style="margin-top:8px;">未导入候选 ' + rejectedItems.length + ' 条（可勾选补充导入）</div>' +
                '<div style="display:flex;gap:8px;">' +
                    '<button class="qaq-import-ghost-btn" id="qaq-select-all-rejected" style="flex:1;">全选候选</button>' +
                    '<button class="qaq-import-ghost-btn" id="qaq-clear-all-rejected" style="flex:1;">清空选择</button>' +
                '</div>' +
                '<div class="qaq-wordbank-preview-list" id="qaq-rejected-preview-list">' + rejectedHtml + '</div>' +
                (rejectedItems.length > 80 ? '<div class="qaq-wordbank-preview-note">仅显示前 80 条未导入候选</div>' : '') +
            '</div>';

        window.qaqModalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-wordbook-import-confirm">确认导入</button>';

        window.qaqOpenModal();

        document.getElementById('qaq-modal-cancel').onclick = window.qaqCloseModal;

        var selectAllBtn = document.getElementById('qaq-select-all-rejected');
        var clearAllBtn = document.getElementById('qaq-clear-all-rejected');

        if (selectAllBtn) {
            selectAllBtn.onclick = function () {
                window.qaqModalBody.querySelectorAll('.qaq-import-reject-check').forEach(function (el) {
                    el.checked = true;
                });
            };
        }

        if (clearAllBtn) {
            clearAllBtn.onclick = function () {
                window.qaqModalBody.querySelectorAll('.qaq-import-reject-check').forEach(function (el) {
                    el.checked = false;
                });
            };
        }

        document.getElementById('qaq-wordbook-import-confirm').onclick = function () {
            var finalName = document.getElementById('qaq-wordbook-name-input').value.trim() || '未命名词库';

            var manualSelected = [];
            
window.qaqModalBody.querySelectorAll('.qaq-import-reject-check:checked').forEach(function (el) {
                var idx = parseInt(el.dataset.idx, 10);
                if (rejectedItems[idx]) {
                    manualSelected.push({
                        id: window.qaqWordId(),
                        word: rejectedItems[idx].word || '',
                        meaning: rejectedItems[idx].meaning || '',
                        phonetic: '',
                        example: '',
                        exampleCn: '',
                        book: sourceName || ''
                    });
                }
            });

            var finalItems = acceptedItems.concat(
                manualSelected.filter(function (item) {
                    return window.qaqTrim(item.word) && window.qaqTrim(item.meaning);
                })
            );

            var deduped = window.qaqDedupeWordItemsWithLog(finalItems);
            finalItems = deduped.accepted;

            if (!finalItems.length) {
                return window.qaqToast('没有可导入的词条');
            }

            var books = window.qaqGetWordbooks();
            books.unshift(window.qaqCreateWordbook(finalName, finalItems, sourceName));
            window.qaqSaveWordbooks(books);

            window.qaqCloseModal();
            var search = document.getElementById('qaq-wordbook-search');
            window.qaqRenderWordbookHome(search ? search.value : '');
            window.qaqToast('导入成功，共 ' + finalItems.length + ' 条');
        };
    };
    
    window.qaqOpenImportModeModal = function (importType, onPick) {
    var saved = window.qaqGetImportSettings ? window.qaqGetImportSettings() : { importMode: 'fast' };
    var lastMode = saved.importMode || 'fast';

    window.qaqModalTitle.textContent = '选择导入方式';
   window.qaqModalBody.innerHTML =
    '<div class="qaq-import-mode-list">' +
        '<div class="qaq-import-mode-item" data-mode="fast">' +
            '<div class="qaq-import-mode-title">快速导入</div>' +
            '<div class="qaq-import-mode-desc">仅使用本地规则解析，速度快，不消耗 API。</div>' +
            '<div class="qaq-import-mode-badge">推荐：格式比较规整的 JSON / Excel</div>' +
        '</div>' +
        '<div class="qaq-import-mode-item" data-mode="smart">' +
            '<div class="qaq-import-mode-title">智能导入</div>' +
            '<div class="qaq-import-mode-desc">先本地解析，再调用 AI 深度修复，适合 PDF、OCR、乱序文本。</div>' +
            '<div class="qaq-import-mode-badge">推荐：PDF / 识别质量差 / 排版混乱</div>' +
        '</div>' +
    '</div>';

    window.qaqModalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';

    window.qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = window.qaqCloseModal;

    window.qaqModalBody.querySelectorAll('.qaq-import-mode-item').forEach(function (el) {
        if (el.dataset.mode === lastMode) {
            el.style.borderColor = 'rgba(196, 112, 104, 0.28)';
        }

        el.addEventListener('click', function () {
            var mode = this.dataset.mode || 'fast';
            window.qaqCurrentImportMode = mode;

            if (window.qaqSaveImportSettings) {
                window.qaqSaveImportSettings({
                    importMode: mode
                });
            }

            window.qaqCloseModal();

            if (typeof onPick === 'function') {
                onPick(mode, importType);
            }
        });
    });
};

    /* ===== Import ===== */
    window.qaqImportWordbankJson = function (file) {
        return new Promise(function (resolve, reject) {
            window.qaqShowImportProgress('正在导入 JSON', '正在读取文件…');

            var reader = new FileReader();
            window.qaqImportCtrl.activeReader = reader;
            window.qaqImportCtrl.busy = true;

            reader.onprogress = function (e) {
                if (window.qaqIsImportCancelled()) return;
                if (e.lengthComputable) {
                    var percent = Math.round((e.loaded / e.total) * 80);
                    window.qaqUpdateImportProgress(percent, '正在读取 JSON…');
                }
            };

            reader.onload = async function (e) {
                try {
                    window.qaqRequireImportNotCancelled();

                    window.qaqUpdateImportProgress(90, '正在解析 JSON…');
                    var data = JSON.parse(e.target.result);

                    var out;
                    if (Array.isArray(data)) out = data;
                    else if (data && Array.isArray(data.items)) out = data.items;
                    else throw new Error('JSON 格式不正确');
                    
                    if (window.qaqCurrentImportMode === 'smart' && (!out || !out.length || (out.length < 10 && typeof e.target.result === 'string'))) {
    try {
        window.qaqRequireImportNotCancelled();
        window.qaqUpdateImportProgress(94, '正在尝试 AI 智能修复 JSON 内容...');
        var aiItems = await window.qaqAiParseWordItems(e.target.result, file.name);
        if (aiItems && aiItems.length > (out ? out.length : 0)) {
            out = aiItems;
        }
    } catch (err2) {
        console.warn('JSON 智能修复失败：', err2);
    }
}

                    window.qaqUpdateImportProgress(100, '解析完成');
                    window.qaqImportCtrl.busy = false;
                    window.qaqImportCtrl.activeReader = null;
                    setTimeout(window.qaqHideImportProgress, 180);
                    resolve(out);
                } catch (err) {
                    window.qaqImportCtrl.busy = false;
                    window.qaqImportCtrl.activeReader = null;
                    window.qaqHideImportProgress();
                    reject(err);
                }
            };

            reader.onerror = function (err) {
                window.qaqImportCtrl.busy = false;
                window.qaqImportCtrl.activeReader = null;
                window.qaqHideImportProgress();
                reject(err);
            };

            reader.onabort = function () {
                window.qaqImportCtrl.busy = false;
                window.qaqImportCtrl.activeReader = null;
                reject(new Error('__QAQ_IMPORT_CANCELLED__'));
            };

            reader.readAsText(file, 'utf-8');
        });
    };

    window.qaqGetNonEmptyRows = function (rows) {
        return (rows || []).filter(function (row) {
            return row && row.some(function (cell) {
                return String(cell || '').trim();
            });
        });
    };

    window.qaqGuessHeaderMap = function (row) {
        function norm(v) {
            return String(v || '').trim().toLowerCase();
        }

        var map = {};
        row.forEach(function (cell, idx) {
            var key = norm(cell);
            if (/^(word|term|vocab|单词|英文|英文单词|外语|词汇)$/.test(key)) map.word = idx;
            if (/^(meaning|translation|chinese|中文|释义|词义|中文解释|解释|含义)$/.test(key)) map.meaning = idx;
            if (/^(phonetic|音标|英音|美音)$/.test(key)) map.phonetic = idx;
            if (/^(example|sentence|例句|例句1|例句一)$/.test(key)) map.example = idx;
            if (/^(examplecn|sentencecn|例句翻译|例句中文|例句释义)$/.test(key)) map.exampleCn = idx;
        });

        return map;
    };

    window.qaqLooksLikeHeader = function (row) {
        var map = window.qaqGuessHeaderMap(row || []);
        return map.word != null || map.meaning != null || map.phonetic != null || map.example != null;
    };

    window.qaqParseExcelRowsToWordbank = function (rows, sheetName) {
    if (!rows || !rows.length) return [];

    var result = [];
    var wIdx = -1, mIdx = -1;
    var startRow = 0;
    var foundMapping = false;

    // 1. 放弃不可靠的表头，直接向下扫描最多 30 行，通过“数据特征”嗅探列的正确位置
    for (var r = 0; r < Math.min(30, rows.length); r++) {
        var row = rows[r];
        if (!row || !row.length) continue;

        var tempW = -1, tempM = -1;

        for (var col = 0; col < row.length; col++) {
            var cellVal = String(row[col] || '').trim();
            if (!cellVal) continue;
            
            // 跳过纯数字（百词斩特有的序号列干扰）
            if (/^\d+$/.test(cellVal)) continue;

            // 寻找最像英文单词的列：调用原生的单词合法性检测，并排除刚好写着Word的那一行
            if (tempW === -1 && window.qaqLooksLikeEnglishWord(cellVal)) {
                var lower = cellVal.toLowerCase();
                if (lower !== 'word' && lower !== 'meaning' && lower !== 'vocabulary') {
                    tempW = col;
                }
            }
            // 寻找最像释义的列：只要包含汉字就认定是释义
            else if (tempM === -1 && window.qaqLooksLikeChineseMeaning(cellVal)) {
                tempM = col;
            }
        }

        // 一旦在某一行同时摸到了真实的“单词列”和“中文列”，锁定列号！
        if (tempW !== -1 && tempM !== -1) {
            wIdx = tempW;
            mIdx = tempM;
            startRow = r; // 从这一行开始往下全当数据读
            foundMapping = true;
            break;
        }
    }

    // 2. 如果智能嗅探没探出来（可能是极特殊的残缺表），老规矩猜表头兜底
    if (!foundMapping) {
        for (var r = 0; r < Math.min(15, rows.length); r++) {
            var map = window.qaqGuessHeaderMap(rows[r]);
            if (map.word !== undefined || map.meaning !== undefined) {
                wIdx = map.word !== undefined ? map.word : 0;
                mIdx = map.meaning !== undefined ? map.meaning : 1;
                startRow = r + 1;
                foundMapping = true;
                break;
            }
        }
    }

    // 3. 终极兜底：强行拿第0列和第1列
    if (!foundMapping) {
        wIdx = 0;
        mIdx = 1;
        startRow = 0;
    }

    // 4. 正式解析提取并清洗
    for (var i = startRow; i < rows.length; i++) {
        var row = rows[i];
        if (!row || !row.length) continue;

        var wordText = wIdx > -1 ? row[wIdx] : '';
        var meaningText = mIdx > -1 ? row[mIdx] : '';

        wordText = String(wordText || '').trim();
        meaningText = String(meaningText || '').trim();

        if (!wordText && !meaningText) continue;

        // 过滤掉百词斩可能插播的“已背”、“未背”等夹缝标题
        if (window.qaqShouldDropWordItem(wordText, meaningText)) continue;

        var item = window.qaqNormalizeWordItem({
            word: wordText,
            meaning: meaningText,
            book: sheetName
        }, sheetName);

        // 二次确认，没问题就收录
        if (item && item.word && item.meaning) {
            result.push(item);
        }
    }

    return result;
};

    window.qaqImportWordbankExcel = function (file) {
        return new Promise(function (resolve, reject) {
            window.qaqShowImportProgress('正在导入 Excel', '正在读取文件…');

            var reader = new FileReader();
            window.qaqImportCtrl.activeReader = reader;
            window.qaqImportCtrl.busy = true;

            reader.onprogress = function (e) {
                if (window.qaqIsImportCancelled()) return;
                if (e.lengthComputable) {
                    var percent = Math.round((e.loaded / e.total) * 60);
                    window.qaqUpdateImportProgress(percent, '正在读取 Excel…');
                }
            };

            reader.onload = async function (e) {
                try {
                    window.qaqRequireImportNotCancelled();

                    window.qaqUpdateImportProgress(70, '正在解析工作表…');
                    var workbook = XLSX.read(e.target.result, { type: 'array' });
                    var result = [];

                    workbook.SheetNames.forEach(function (sheetName, idx) {
                        var sheet = workbook.Sheets[sheetName];
                        var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                        result = result.concat(window.qaqParseExcelRowsToWordbank(rows, sheetName));

                        var p = 70 + Math.round(((idx + 1) / workbook.SheetNames.length) * 25);
                        window.qaqUpdateImportProgress(p, '正在解析工作表：' + sheetName);
                    });

                    result = window.qaqDedupeWordItems(result);
                    
                    if (window.qaqCurrentImportMode === 'smart' && result.length < 20) {
    try {
        window.qaqRequireImportNotCancelled();
        window.qaqUpdateImportProgress(94, '本地识别较少，正在尝试 AI 智能修复...');

        var workbookText = '';
        workbook.SheetNames.forEach(function (sheetName) {
            var sheet = workbook.Sheets[sheetName];
            var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            workbookText += '\n# Sheet: ' + sheetName + '\n';
            rows.forEach(function (row) {
                workbookText += row.join(' | ') + '\n';
            });
        });

        var aiItems = await window.qaqAiParseWordItems(workbookText, file.name);
        if (aiItems && aiItems.length > result.length) {
            result = window.qaqDedupeWordItems(aiItems);
        }
    } catch (e) {
        console.warn('Excel 智能修复失败：', e);
    }
}

                    window.qaqUpdateImportProgress(100, '解析完成');
                    window.qaqImportCtrl.busy = false;
                    window.qaqImportCtrl.activeReader = null;
                    setTimeout(window.qaqHideImportProgress, 180);
                    resolve(result);
                } catch (err) {
                    window.qaqImportCtrl.busy = false;
                    window.qaqImportCtrl.activeReader = null;
                    window.qaqHideImportProgress();
                    reject(err);
                }
            };

            reader.onerror = function (err) {
                window.qaqImportCtrl.busy = false;
                window.qaqImportCtrl.activeReader = null;
                window.qaqHideImportProgress();
                reject(err);
            };

            reader.onabort = function () {
                window.qaqImportCtrl.busy = false;
                window.qaqImportCtrl.activeReader = null;
                reject(new Error('__QAQ_IMPORT_CANCELLED__'));
            };

            reader.readAsArrayBuffer(file);
        });
    };

    window.qaqNextFrame = function () {
        return new Promise(function (resolve) {
            setTimeout(resolve, 0);
        });
    };

window.qaqParsePdfLinesToWordbankAsync = async function (lines, bookName) {
    var cleanLines = [];
    for (var i = 0; i < lines.length; i++) {
        var l = lines[i].replace(/[\u200B-\u200D\uFEFF]/g, '');
        l = window.qaqTrim(l);
        
        if (!l) continue;

        // 【终极必杀：剥除所有的章节和分类表头】
        // 把字符里的空格、字母和数字抹掉，只看纯汉字结构
        var testStr = l.replace(/[\s　a-zA-Z0-9\-\.]/g, ''); 
        // 只要它是典型的词书分类大纲，直接扔进垃圾桶，绝对不让解析器看到它！
        if (/^(实义词汇|非实义词汇|実義词汇|抽象概念|动作与行为|状态与性质|人物与人际|自然与地理|空间与方向|身体与健康|服装与物品|建筑与场所|社会与经济|科技与媒体|交通与旅行|程度与频率|饮食|语言与沟通|教育与学习|文化艺术与娱乐|文化、艺术与娱乐|时间|感叹词|连接词|指示词与疑问词|接头词与接尾词|其他功能词|常用词汇|核心词汇)$/.test(testStr)) {
    continue;
}
// 过滤 JLPT 等级标签（N1~N5）
if (/^N[1-5]$/.test(l)) {
    continue;
}
// 过滤日语词性标注行（如 "名"、"动1自"、"形2"、"名・动3他"、"副・形2"、"连体"、"感"、"接"、"后缀"、"前缀"、"副・名"等）
if (/^(名|动[1-3]?[自他]*|形[12]?|副|连体|感|接|后缀|前缀)([\s・](名|动[1-3]?[自他]*|形[12]?|副|连体|感|接|后缀|前缀))*$/.test(l)) {
    continue;
}

        if (!window.qaqLooksLikeNoiseLine(l)) {
            cleanLines.push(l);
        }
    }

    // ===== 智能导入：优先尝试 AI 深度解析 =====
    if (window.qaqCurrentImportMode === 'smart') {
        try {
            var cfg = window.qaqGetImportAiConfig();
            var canUseAi = !!(cfg.key && cfg.model && cfg.url);

            if (canUseAi) {
                var joinedText = cleanLines.join('\n');
                
                var chunkSize = 2500;
                var chunks = [];
                var currentChunk = '';
                var linesList = joinedText.split('\n');
                
                for (var li = 0; li < linesList.length; li++) {
                    var testChunk = currentChunk + (currentChunk ? '\n' : '') + linesList[li];
                    if (testChunk.length > chunkSize && currentChunk) {
                        chunks.push(currentChunk);
                        currentChunk = linesList[li];
                    } else {
                        currentChunk = testChunk;
                    }
                }
                if (currentChunk) chunks.push(currentChunk);

                var aiResults = [];

                for (var idx = 0; idx < chunks.length; idx++) {
                    window.qaqRequireImportNotCancelled();

                    var pct = 30 + Math.round((idx / Math.max(1, chunks.length)) * 55);

                    if (window.qaqUpdateImportProgress) {
                        window.qaqUpdateImportProgress(pct, 'AI 深度解析中（第 ' + (idx + 1) + '/' + chunks.length + ' 段）...');
                    }

                    var parsedChunk = await window.qaqAiParseWordItems(chunks[idx], bookName);
                    aiResults = aiResults.concat(parsedChunk);

                    await window.qaqNextFrame();
                }

                aiResults = window.qaqDedupeWordItems(aiResults);

                if (aiResults.length > 5) {
                    console.log('[QAQ Import] AI 智能解析成功共 ' + aiResults.length + ' 条，直接使用 AI 数据！');
                    window.qaqUpdateImportProgress(95, 'AI 数据清洗完成...');
                    return aiResults;
                } else {
                    console.log('[QAQ Import] AI 解析数量异常少，将转入本地兜底...');
                }
            }
        } catch (err) {
            if (window.qaqIsCancelError && window.qaqIsCancelError(err)) throw err;
            console.warn('PDF 智能解析报错，回退本地解析：', err);
        }
    }

    // ===== 本地兜底解析 =====
    if (window.qaqUpdateImportProgress) window.qaqUpdateImportProgress(90, '正在执行本地解析...');
    return await _qaqLocalPdfParse(cleanLines, bookName);
};

// 把本地解析逻辑抽出来复用
async function _qaqLocalPdfParse(cleanLines, bookName) {
    var lang = window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en';

    if (window.qaqUpdateImportProgress) {
        window.qaqUpdateImportProgress(92, '正在执行本地规则解析...');
    }
// 【新增】日语专用：按序号分组解析
    if (lang === 'ja') {
        var jaResult = _qaqLocalJaPdfParse(cleanLines, bookName);
        if (jaResult.length > 5) {
            return jaResult;
        }
        // 如果序号分组失败，继续走通用逻辑
    }
    var resultAdjacent = [], resultIndexed = [], resultInline = [];

    var adjClean = cleanLines.filter(function (l) { return !window.qaqIsPureIndexLine(l); });
    for (var n = 0; n < adjClean.length - 1; n++) {
        var w = adjClean[n], m = adjClean[n + 1];
        
        var skipAdjacent = false;
        if (lang === 'ja' && /[\s　]*[\u4e00-\u9fa5]+/.test(w)) {
            skipAdjacent = true;
        }

        if (!skipAdjacent && window.qaqLooksLikeEnglishWord(w) && window.qaqLooksLikeChineseMeaning(m)) {
            resultAdjacent.push({
                id: window.qaqWordId(),
                word: w, meaning: m, phonetic: '', example: '', exampleCn: '', book: bookName
            });
            n++;
        }
    }

    var dictB = {};
    var currentIdB = null;
    for (var j = 0; j < cleanLines.length; j++) {
        var lineB = cleanLines[j];
        if (/^\d+$/.test(lineB)) {
            currentIdB = parseInt(lineB, 10);
            if (!dictB[currentIdB]) dictB[currentIdB] = { word: '', meaning: '' };
            continue;
        }
        if (currentIdB !== null) {
            if (window.qaqLooksLikeEnglishWord(lineB) && lineB.toLowerCase() !== 'word' && lineB.toLowerCase() !== 'meaning') {
                if (!dictB[currentIdB].word) dictB[currentIdB].word = lineB;
            } else if (window.qaqLooksLikeChineseMeaning(lineB) || window.qaqLooksLikePosLine(lineB)) {
                dictB[currentIdB].meaning += (dictB[currentIdB].meaning ? ' ' : '') + lineB;
            }
        }
    }
    Object.keys(dictB).forEach(function (k) {
        if (dictB[k].word && dictB[k].meaning) {
            resultIndexed.push({ id: window.qaqWordId(), word: dictB[k].word, meaning: dictB[k].meaning, phonetic: '', example: '', exampleCn: '', book: bookName });
        }
    });

    var lastInlineItem = null;
    for (var c = 0; c < cleanLines.length; c++) {
        var lineC = cleanLines[c];
        if (window.qaqIsPureIndexLine(lineC)) continue;

        var prefixMatch = lineC.match(/^(\d+)[\.、]\s*(.*)$/);
        var tempWord = '', tempMeaning = '', tempPhonetic = '';
        var inlineExtracted = false;

        if (prefixMatch) {
            var rest = prefixMatch[2];
            var phoneMatch = rest.match(/^(.*?)\s*(?:\[(.*?)\]|\/(.*?)\/)\s*(.*)$/);
            if (phoneMatch) {
                tempWord = phoneMatch[1];
                tempPhonetic = phoneMatch[2] || phoneMatch[3] || '';
                tempMeaning = phoneMatch[4] || '';
                inlineExtracted = true;
            } else {
                var cnIndex = rest.search(/[\u4e00-\u9fa5]/);
                if (cnIndex > -1 && lang !== 'ja') { 
                    tempWord = rest.substring(0, cnIndex);
                    tempMeaning = rest.substring(cnIndex);
                    inlineExtracted = true;
                } else {
                    tempWord = rest;
                    inlineExtracted = true;
                }
            }
        } else if (lang === 'ja') {
            var jaInlineMatch = lineC.match(/^([^\s　]+)[\s　]+(.*[\u4e00-\u9fa5].*)$/);
            if (jaInlineMatch) {
                tempWord = jaInlineMatch[1];
                tempMeaning = jaInlineMatch[2];
                inlineExtracted = true;
            } else {
                var kanaToKanji = lineC.match(/^([\u3040-\u309F\u30A0-\u30FF\u30FCa-zA-Z0-9]+)([\u4e00-\u9fa5].*)$/);
                if (kanaToKanji) {
                    tempWord = kanaToKanji[1]; 
                    tempMeaning = kanaToKanji[2]; 
                    inlineExtracted = true;
                }
            }
        }

        if (inlineExtracted && tempWord) {
            lastInlineItem = {
                id: window.qaqWordId(),
                word: window.qaqTrim(tempWord).replace(/[,;]$/, ''),
                phonetic: window.qaqTrim(tempPhonetic),
                meaning: window.qaqTrim(tempMeaning) || '待补全',
                example: '', exampleCn: '', book: bookName
            };
            resultInline.push(lastInlineItem);
        } else if (lastInlineItem) {
            if (window.qaqLooksLikeChineseMeaning(lineC) || /^[a-z]/.test(lineC)) {
                lastInlineItem.meaning += (lastInlineItem.meaning === '待补全' ? '' : ' ') + lineC;
            }
        }
    }

    var validInline = resultInline.filter(function (x) { return x.word && x.meaning; });
    var validIndexed = resultIndexed.filter(function (x) { return x.word && x.meaning; });
    var validAdj = resultAdjacent.filter(function (x) { return x.word && x.meaning; });

    var maxCount = Math.max(validAdj.length, validIndexed.length, validInline.length);
    if (maxCount === 0) return [];
    if (maxCount === validInline.length && validInline.length > 5) return validInline;
    if (maxCount === validIndexed.length && validIndexed.length > 5) return validIndexed;
    return validAdj;
}

// 【新增】日语PDF专用解析：彻底利用空格打碎文本流，规避错行和长串粘连
function _qaqLocalJaPdfParse(cleanLines, bookName) {
    // 1. 将所有输入不管三七二十一，全部用空格强行打碎为独立 Token
    var allTokens = [];
    for (var i = 0; i < cleanLines.length; i++) {
        var line = cleanLines[i];
        var parts = line.split(/[\s　]+/);
        for (var j = 0; j < parts.length; j++) {
            var p = parts[j].trim();
            // 剥除无意义的独立标点造成的污染
            if (p && p !== '；' && p !== '，') {
                allTokens.push(p);
            }
        }
    }

    // 2. 利用最前面那个绝对可靠的 "纯数字序号" 重新编组
    var groups = [];
    var currentGroup = null;

    for (var k = 0; k < allTokens.length; k++) {
        var token = allTokens[k];
        // 发现纯数字（不超过4位数，例如 1087 / 2424），立刻建立一个新词条的圈子！
        if (/^\d+$/.test(token) && token.length <= 4) {
            if (currentGroup && currentGroup.tokens.length > 0) {
                groups.push(currentGroup);
            }
            currentGroup = { id: parseInt(token, 10), tokens: [] };
            continue;
        }
        if (currentGroup) {
            currentGroup.tokens.push(token);
        }
    }
    if (currentGroup && currentGroup.tokens.length > 0) {
        groups.push(currentGroup);
    }

    var result = [];

    // 3. 对每个圈子里的数据，按排位归类清算
    for (var g = 0; g < groups.length; g++) {
        var tokens = groups[g].tokens;
        
        var validTokens = [];
        for (var j = 0; j < tokens.length; j++) {
            var t = tokens[j];
            // 毫不留情地过滤掉 N3、N4、N5
            if (/^N[1-5]$/.test(t)) continue;
            // 毫不留情地过滤掉诸如 实义词汇、时间 等分类噪音
            if (/^(实义词汇|非实义词汇|抽象概念|动作与行为|状态与性质|人物与人际|自然与地理|空间与方向|身体与健康|服装与物品|建筑与场所|社会与经济|科技与媒体|交通与旅行|程度与频率|饮食|语言与沟通|教育与学习|文化.*娱乐|时间|感叹词|连接词|指示词.*疑问词|接头词.*接尾词|其他功能词|常用词汇|核心词汇)$/.test(t)) continue;
            validTokens.push(t);
        }

        if (validTokens.length === 0) continue;

        var posTag = '';
        // 剥离第一位的 词性（如 名、后缀、名・动3他）
        if (/^(名|动[1-3]?[自他]*|形[12]?|副|连体|感|接|后缀|前缀)([\s・](名|动[1-3]?[自他]*|形[12]?|副|连体|感|接|后缀|前缀))*$/.test(validTokens[0])) {
            posTag = validTokens.shift() + ' ';
        }

        if (validTokens.length === 0) continue;

        var word = '';
        var phonetic = '';
        var meaning = '';

        // 走到这一步，噪音已经完全清理干净，留下的顺序必然是： 假名 - 汉字写法(可能有) - 中文释义
        var t0 = validTokens[0];
        
        if (validTokens.length === 1) {
            word = t0;
            meaning = "待补全";
        } else if (validTokens.length === 2) {
            // 没有汉字写法，只有[假名, 释义]
            if (/[\u3040-\u309F\u30A0-\u30FF]/.test(t0)) {
                phonetic = t0;
                word = t0;
            } else {
                word = t0;
            }
            meaning = validTokens[1];
        } else {
            // [词0, 词1, 词2...] —— 关键：判断夹在中间的是日语汉字，还是长释义的第一部分
            var t1 = validTokens[1];
            var t1IsKanji = false;

            if (/[\u3040-\u309F\u30A0-\u30FF]/.test(t1)) {
                t1IsKanji = true; // 含有平/片假名，必然是日语词（如~人）
            } else if (/[；，（）、：!?\.,;]/.test(t1)) {
                t1IsKanji = false; // 含有明显中文释义符号
            } else {
                t1IsKanji = true; // 默认视为存在汉字写法
            }

            if (t1IsKanji) {
                phonetic = t0;
                word = t1;
                // 余下所有碎片，全部缝合归入中文释义
                meaning = validTokens.slice(2).join(' ');
            } else {
                if (/[\u3040-\u309F\u30A0-\u30FF]/.test(t0)) phonetic = t0;
                word = t0;
                meaning = validTokens.slice(1).join(' ');
            }
        }

        if (word && meaning) {
            result.push({
                id: window.qaqWordId ? window.qaqWordId() : ('w_' + Date.now() + Math.random().toString(36).substr(2, 5)),
                word: word,
                phonetic: phonetic,
                meaning: (posTag + meaning).trim(),
                example: '',
                exampleCn: '',
                book: bookName
            });
        }
    }

    return result;
}

// 【新增】合并两个解析结果，以 word 为 key 去重，优先保留信息更完整的
function _qaqMergeWordResults(localItems, aiItems) {
    var map = {};
    
    // 先放本地的
    localItems.forEach(function(item) {
        var key = window.qaqTrim(item.word).toLowerCase();
        if (key) map[key] = item;
    });
    
    // AI 的覆盖或补充
    aiItems.forEach(function(item) {
        var key = window.qaqTrim(item.word).toLowerCase();
        if (!key) return;
        
        if (!map[key]) {
            // 本地没有的，补充进来
            map[key] = item;
        } else {
            // 本地有的，如果 AI 的信息更丰富就替换
            var existing = map[key];
            var aiScore = (item.phonetic ? 1 : 0) + (item.meaning ? item.meaning.length : 0);
            var localScore = (existing.phonetic ? 1 : 0) + (existing.meaning ? existing.meaning.length : 0);
            if (aiScore > localScore) {
                map[key] = item;
            }
        }
    });
    
    return Object.keys(map).map(function(k) { return map[k]; });
}

    window.qaqImportWordbankPdf = async function (file) {
        window.qaqShowImportProgress('正在导入 PDF', '正在读取文件…');
        window.qaqImportCtrl.busy = true;

        var arrayBuffer = await file.arrayBuffer();
        window.qaqRequireImportNotCancelled();

        window.qaqUpdateImportProgress(2, '文件已读取，正在加载 PDF…');

        var loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        window.qaqImportCtrl.loadingTask = loadingTask;

        var pdf = await loadingTask.promise;
        window.qaqRequireImportNotCancelled();

        var lines = [];
        var totalPages = pdf.numPages || 1;

        for (var i = 1; i <= totalPages; i++) {
            window.qaqRequireImportNotCancelled();

            var page = await pdf.getPage(i);
            var textContent = await page.getTextContent();
            var lastY = null;
var lastX = 0;
var currentLine = '';
var isJa = (window.qaqGetWordbankLanguage && window.qaqGetWordbankLanguage() === 'ja');

textContent.items.forEach(function(item) {
    var y = item.transform ? item.transform[5] : null;
    var x = item.transform ? item.transform[4] : 0;
    var w = item.width || 0;
    var str = item.str || '';

    // 日语PDF的关键修复：用更小的Y阈值来正确断行
    // 这份RJ版PDF每个字段都在不同的Y坐标上，阈值必须非常小
    var lineThreshold = isJa ? 1 : 5;
    // 双栏检测的X间距
    var columnGap = isJa ? 60 : 120;

    if (lastY !== null && y !== null && Math.abs(y - lastY) > lineThreshold) {
        // Y坐标变化 = 换行
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = str;
    } else if (lastX > 0 && x > 0 && (x - lastX) > columnGap) {
        // 同一行但X坐标跳跃太大 = 双栏分界
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = str;
    } else {
        // 同一行内的文本片段，加空格分隔（防止粘连）
        if (currentLine && str && !currentLine.endsWith(' ') && !str.startsWith(' ')) {
            // 但如果前一个字符和当前字符都是CJK，不加空格
            var lastChar = currentLine[currentLine.length - 1];
            var firstChar = str[0];
            var isCJK = function(ch) {
                var code = ch.charCodeAt(0);
                return (code >= 0x3000 && code <= 0x9FFF) || 
                       (code >= 0x30A0 && code <= 0x30FF) ||
                       (code >= 0x3040 && code <= 0x309F);
            };
            if (isCJK(lastChar) && isCJK(firstChar)) {
                currentLine += str;
            } else {
                currentLine += str;
            }
        } else {
            currentLine += str;
        }
    }
    lastY = y;
    lastX = x + (w || 0);
});
if (currentLine.trim()) lines.push(currentLine.trim());

            var p = 40 + Math.round((i / totalPages) * 50);
            window.qaqUpdateImportProgress(p, '正在解析第 ' + i + ' / ' + totalPages + ' 页…');

            await window.qaqNextFrame();
        }

        window.qaqRequireImportNotCancelled();

        window.qaqUpdateImportProgress(93, '正在整理词条…');
        
        var parsed = await window.qaqParsePdfLinesToWordbankAsync(lines, file.name);

        window.qaqUpdateImportProgress(100, '解析完成');
        window.qaqImportCtrl.busy = false;
        window.qaqImportCtrl.loadingTask = null;
        setTimeout(window.qaqHideImportProgress, 220);

        return parsed;
    };

    /* ===== Theme ===== */
    window.qaqApplyWordbankTheme = function () {
        var theme = window.qaqGetWordbankTheme();

        var pageBg = document.getElementById('qaq-wordbank-page-bg');
        var pageOverlay = document.getElementById('qaq-wordbank-page-bg-overlay');
        var detailBg = document.getElementById('qaq-wordbook-detail-page-bg');
        var detailOverlay = document.getElementById('qaq-wordbook-detail-page-bg-overlay');

        if (theme.appBg) {
            if (pageBg) {
                pageBg.style.backgroundImage = 'url(' + theme.appBg + ')';
                pageBg.style.display = '';
            }
            if (detailBg) {
                detailBg.style.backgroundImage = 'url(' + theme.appBg + ')';
                detailBg.style.display = '';
            }

            var op = (theme.appOpacity != null ? theme.appOpacity : 30) / 100;

            if (pageOverlay) {
                pageOverlay.style.background = 'rgba(0,0,0,' + op + ')';
                pageOverlay.style.display = '';
            }
            if (detailOverlay) {
                detailOverlay.style.background = 'rgba(0,0,0,' + op + ')';
                detailOverlay.style.display = '';
            }
        } else {
            if (pageBg) {
                pageBg.style.backgroundImage = '';
                pageBg.style.display = 'none';
            }
            if (detailBg) {
                detailBg.style.backgroundImage = '';
                detailBg.style.display = 'none';
            }
            if (pageOverlay) pageOverlay.style.display = 'none';
            if (detailOverlay) detailOverlay.style.display = 'none';
        }
    };

    window._qaqCardThemeTimer = null;
    window.qaqApplyWordbankCardThemeDebounced = function () {
        clearTimeout(window._qaqCardThemeTimer);
        window._qaqCardThemeTimer = setTimeout(window.qaqApplyWordbankCardTheme, 150);
    };

    window.qaqApplyWordbankCardTheme = function () {
        var theme = window.qaqGetWordbankTheme();
        var cardBg = theme.cardBg || '';
        var opacity = (theme.cardOpacity != null ? theme.cardOpacity : 55) / 100;
        var isDark = document.querySelector('.qaq-phone-frame').classList.contains('qaq-theme-dark');
        var overlayColor = isDark ? 'rgba(0,0,0,' + opacity + ')' : 'rgba(255,255,255,' + opacity + ')';

        function applyToCards(selector) {
            var cards = document.querySelectorAll(selector);
            cards.forEach(function (card) {
                var oldBg = card.querySelector('.qaq-wordbank-card-custom-bg');

                if (!cardBg) {
                    if (oldBg) oldBg.remove();
                    card.classList.remove('qaq-has-custom-bg');
                    card.style.background = '';
                    card.style.border = '';
                    return;
                }

                if (!oldBg) {
                    oldBg = document.createElement('div');
                    oldBg.className = 'qaq-wordbank-card-custom-bg';
                    oldBg.innerHTML =
                        '<img src="' + cardBg + '">' +
                        '<div class="qaq-wordbank-card-custom-overlay"></div>';
                    card.insertBefore(oldBg, card.firstChild);
                } else {
                    var img = oldBg.querySelector('img');
                    if (img && img.getAttribute('src') !== cardBg) {
                        img.setAttribute('src', cardBg);
                    }
                }

                var overlay = oldBg.querySelector('.qaq-wordbank-card-custom-overlay');
                if (overlay) overlay.style.background = overlayColor;

                card.classList.add('qaq-has-custom-bg');
                card.style.background = 'transparent';
                card.style.border = '1px solid rgba(255,255,255,0.3)';
            });
        }

        applyToCards('.qaq-wordbook-card');
        applyToCards('.qaq-word-entry-card');
    };

    window.qaqRenderWordbankThemePage = function () {
        var theme = window.qaqGetWordbankTheme();

        var appPreview = document.getElementById('qaq-wbt-app-preview');
        if (theme.appBg) {
            var op = (theme.appOpacity != null ? theme.appOpacity : 30) / 100;
            appPreview.innerHTML =
                '<img src="' + theme.appBg + '">' +
                '<div class="qaq-preview-overlay" id="qaq-wbt-app-overlay" style="background:rgba(0,0,0,' + op + ');"></div>';
        } else {
            appPreview.innerHTML =
                '<div class="qaq-wp-placeholder">' +
                    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">' +
                        '<rect x="3" y="3" width="18" height="18" rx="2" stroke-linejoin="round"/>' +
                        '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                        '<path d="M21 15l-5-5L5 21"/>' +
                    '</svg>点击下方按钮设置背景' +
                '</div>';
        }

        document.getElementById('qaq-wbt-app-opacity').value = theme.appOpacity != null ? theme.appOpacity : 30;
        document.getElementById('qaq-wbt-app-opacity-val').textContent =
            document.getElementById('qaq-wbt-app-opacity').value + '%';

        var cardPreview = document.getElementById('qaq-wbt-card-preview');
        if (theme.cardBg) {
            var cardOp = (theme.cardOpacity != null ? theme.cardOpacity : 55) / 100;
            var isDark = document.querySelector('.qaq-phone-frame').classList.contains('qaq-theme-dark');
            var cardOverlayColor = isDark ? 'rgba(0,0,0,' + cardOp + ')' : 'rgba(255,255,255,' + cardOp + ')';

            cardPreview.innerHTML =
                '<img src="' + theme.cardBg + '">' +
                '<div class="qaq-preview-overlay" id="qaq-wbt-card-overlay" style="background:' + cardOverlayColor + ';"></div>';
        } else {
            cardPreview.innerHTML =
                '<div class="qaq-wp-placeholder" style="font-size:11px;">' +
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">' +
                        '<rect x="3" y="3" width="18" height="18" rx="2" stroke-linejoin="round"/>' +
                        '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                        '<path d="M21 15l-5-5L5 21"/>' +
                    '</svg>未设置' +
                '</div>';
        }

        document.getElementById('qaq-wbt-card-opacity').value = theme.cardOpacity != null ? theme.cardOpacity : 55;
        document.getElementById('qaq-wbt-card-opacity-val').textContent =
            document.getElementById('qaq-wbt-card-opacity').value + '%';
    };

    /* ===== File Input Change ===== */
    if (window.qaqWordbankFileInput) {
        window.qaqWordbankFileInput.addEventListener('change', async function () {
            if (!this.files || !this.files.length) return;

            try {
                for (var i = 0; i < this.files.length; i++) {
                    var file = this.files[i];
                    var lower = file.name.toLowerCase();
                    var imported = [];
                    
                    if (window.qaqCurrentImportMode === 'smart') {
    console.log('[QAQ Import] 当前模式：智能导入');
} else {
    console.log('[QAQ Import] 当前模式：快速导入');
}

if (window.qaqToast) {
    window.qaqToast(window.qaqCurrentImportMode === 'smart' ? '正在使用智能导入' : '正在使用快速导入');
}

                    if (lower.endsWith('.json')) {
                        imported = await window.qaqImportWordbankJson(file);
                    } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
                        imported = await window.qaqImportWordbankExcel(file);
                    } else if (lower.endsWith('.pdf')) {
                        imported = await window.qaqImportWordbankPdf(file);
                    }

                    if (!imported || !imported.length) {
                        window.qaqToast('没有识别到有效词条');
                        continue;
                    }

                    if (Array.isArray(imported) && imported.length && imported[0].words) {
                        var books = window.qaqGetWordbooks();
                        imported.forEach(function (book) {
                            books.unshift({
                                id: book.id || window.qaqWordbookId(),
                                name: book.name || '未命名词库',
                                importedAt: book.importedAt || Date.now(),
                                sourceName: book.sourceName || file.name,
                                words: (book.words || []).map(function (w) {
                                    return {
                                        id: w.id || window.qaqWordId(),
                                        word: w.word || '',
                                        meaning: w.meaning || '',
                                        phonetic: w.phonetic || '',
                                        example: w.example || '',
                                        exampleCn: w.exampleCn || ''
                                    };
                                }).filter(function (w) {
                                    return String(w.word || '').trim() && String(w.meaning || '').trim();
                                })
                            });
                        });
                        window.qaqSaveWordbooks(books);

                        var search = document.getElementById('qaq-wordbook-search');
                        window.qaqRenderWordbookHome(search ? search.value : '');
                        window.qaqToast('导入成功');
                        continue;
                    }

                    var normalized = imported
                        .map(function (item) { return window.qaqNormalizeWordItem(item) || item; })
                        .filter(function (item) {
                            return item && (item.word || item.meaning);
                        });

                    var classified = window.qaqClassifyWordCandidates(normalized);

                    if (!classified.accepted.length && !classified.rejected.length) {
                        window.qaqToast('没有识别到有效词条');
                        continue;
                    }

                    var bookName = file.name.replace(/\.(json|xlsx|xls|pdf)$/i, '');
                    window.qaqOpenWordbookImportReview(
                        bookName,
                        classified.accepted,
                        classified.rejected,
                        file.name
                    );
                }
            } catch (err) {
                console.error(err);

                if (window.qaqIsCancelError(err)) {
                    window.qaqToast('已取消导入');
                } else {
                    window.qaqToast('导入失败');
                }
            }

            window.qaqImportCtrl.busy = false;
            window.qaqImportCtrl.loadingTask = null;
            window.qaqImportCtrl.activeReader = null;
            window.qaqHideImportProgress();
            this.value = '';
        });
    }

    /* ===== Event Bindings ===== */
    if (window.qaqWordbankPage) {
        var wbBack = document.getElementById('qaq-wordbank-back');
        if (wbBack) {
            wbBack.addEventListener('click', function () {
                window.qaqCloseWordbankPage();
            });
        }

        var wbDetailBack = document.getElementById('qaq-wordbook-detail-back');
        if (wbDetailBack) {
            wbDetailBack.addEventListener('click', function () {
                window.qaqCloseWordbookDetail();
            });
        }

        document.querySelectorAll('.qaq-wordbank-tab').forEach(function (btn) {
            if (btn.dataset.tab) {
                btn.addEventListener('click', function () {
                    window.qaqSwitchWordbankTab(this.dataset.tab);
                });
            }
        });

        var wbSearch = document.getElementById('qaq-wordbook-search');
        if (wbSearch) {
            wbSearch.addEventListener('input', window.qaqDebounce(function () {
                window.qaqRenderWordbookHome(this.value);
            }, 160));
        }

        var wbDetailSearch = document.getElementById('qaq-wordbook-detail-search');
        if (wbDetailSearch) {
            wbDetailSearch.addEventListener('input', window.qaqDebounce(function () {
                if (window.qaqCurrentWordbookId) {
                    window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, this.value);
                }
            }, 160));
        }

        var wbAddWordBtn = document.getElementById('qaq-wordbook-add-word-btn');
        if (wbAddWordBtn) {
            wbAddWordBtn.addEventListener('click', function () {
                window.qaqAddWordEntryToCurrentBook();
            });
        }

        var wbImportBtn = document.getElementById('qaq-wordbank-import-btn');
        if (wbImportBtn) {
            wbImportBtn.addEventListener('click', function () {
                window.qaqModalTitle.textContent = '导入词库';
                window.qaqModalBody.innerHTML =
                    '<div class="qaq-modal-upload-options">' +
                        '<button class="qaq-modal-upload-btn" id="qaq-import-json-btn">导入 JSON</button>' +
                        '<button class="qaq-modal-upload-btn" id="qaq-import-excel-btn">导入 Excel</button>' +
                        '<button class="qaq-modal-upload-btn" id="qaq-import-pdf-btn">导入 PDF</button>' +
                    '</div>';

                window.qaqModalBtns.innerHTML =
                    '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';

                window.qaqOpenModal();
                document.getElementById('qaq-modal-cancel').onclick = window.qaqCloseModal;

                document.getElementById('qaq-import-json-btn').onclick = function () {
    window.qaqOpenImportModeModal('json', function (mode) {
        window.qaqPendingImportType = 'json';
        window.qaqWordbankFileInput.accept = '.json';
        window.qaqWordbankFileInput.click();
    });
    
};

document.getElementById('qaq-import-excel-btn').onclick = function () {
    window.qaqOpenImportModeModal('excel', function (mode) {
        window.qaqPendingImportType = 'excel';
        window.qaqWordbankFileInput.accept = '.xlsx,.xls';
        window.qaqWordbankFileInput.click();
    });
    
};

document.getElementById('qaq-import-pdf-btn').onclick = function () {
    window.qaqOpenImportModeModal('pdf', function (mode) {
        window.qaqPendingImportType = 'pdf';
        window.qaqWordbankFileInput.accept = '.pdf';
        window.qaqWordbankFileInput.click();
    });
    
};
            });
        }

        var wbExportBtn = document.getElementById('qaq-wordbank-export-btn');
        if (wbExportBtn) {
            wbExportBtn.addEventListener('click', function () {
                window.qaqExportWordbooks();
            });
        }

        var wbMoreBtn = document.getElementById('qaq-wordbook-more-btn');
        if (wbMoreBtn) {
            wbMoreBtn.addEventListener('click', function () {
                if (!window.qaqCurrentWordbookId) return;
                window.qaqEditWordbookMeta(window.qaqCurrentWordbookId);
            });
        }

        var wbList = document.getElementById('qaq-wordbook-list');
        if (wbList) {
            wbList.addEventListener('click', function (e) {
                var card = e.target.closest('.qaq-wordbook-card');
                if (!card) return;
                var bookId = card.dataset.bookId;
                if (!bookId) return;

                if (window.qaqWordbookSelectMode) {
                    window.qaqToggleInArray(window.qaqSelectedWordbookIds, bookId);
                    var search = document.getElementById('qaq-wordbook-search');
                    window.qaqRenderWordbookHome(search ? search.value : '');
                } else {
                    window.qaqOpenWordbookDetail(bookId);
                }
            });
        }

        var wbDetailList = document.getElementById('qaq-wordbook-detail-list');
        if (wbDetailList) {
            wbDetailList.addEventListener('click', function (e) {
                if (!window.qaqCurrentWordbookId) return;

                var editBtn = e.target.closest('.qaq-word-entry-btn-edit');
                if (editBtn) {
                    e.stopPropagation();
                    window.qaqEditWordEntry(window.qaqCurrentWordbookId, editBtn.dataset.id);
                    return;
                }

                var delBtn = e.target.closest('.qaq-word-entry-btn-del');
                if (delBtn) {
                    e.stopPropagation();
                    window.qaqDeleteWordEntry(window.qaqCurrentWordbookId, delBtn.dataset.id);
                    return;
                }

                if (window.qaqWordEntrySelectMode) {
                    var card = e.target.closest('.qaq-word-entry-card');
                    if (!card) return;
                    var wordId = card.dataset.wordId;
                    if (!wordId) return;

                    window.qaqToggleInArray(window.qaqSelectedWordIds, wordId);
                    var detailSearch = document.getElementById('qaq-wordbook-detail-search');
                    window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, detailSearch ? detailSearch.value : '');
                }
            });
        }

        /* ===== Batch Select ===== */
        var wbSelectBtn = document.getElementById('qaq-wordbank-select-btn');
        if (wbSelectBtn) {
            wbSelectBtn.addEventListener('click', function () {
                window.qaqWordbookSelectMode = !window.qaqWordbookSelectMode;
                if (!window.qaqWordbookSelectMode) window.qaqSelectedWordbookIds = [];
                var search = document.getElementById('qaq-wordbook-search');
                window.qaqRenderWordbookHome(search ? search.value : '');
            });
        }

        var wbBatchCancel = document.getElementById('qaq-wordbook-batch-cancel-btn');
        if (wbBatchCancel) {
            wbBatchCancel.addEventListener('click', function () {
                window.qaqWordbookSelectMode = false;
                window.qaqSelectedWordbookIds = [];
                var search = document.getElementById('qaq-wordbook-search');
                window.qaqRenderWordbookHome(search ? search.value : '');
            });
        }

        var wbSelectAll = document.getElementById('qaq-wordbook-select-all-btn');
        if (wbSelectAll) {
            wbSelectAll.addEventListener('click', function () {
                var books = window.qaqGetWordbooks();
                var search = document.getElementById('qaq-wordbook-search');
                var kw = search ? search.value.trim().toLowerCase() : '';

                if (kw) {
                    books = books.filter(function (book) {
                        return (book.name || '').toLowerCase().indexOf(kw) > -1;
                    });
                }

                if (window.qaqSelectedWordbookIds.length === books.length) {
                    window.qaqSelectedWordbookIds = [];
                } else {
                    window.qaqSelectedWordbookIds = books.map(function (b) { return b.id; });
                }

                window.qaqRenderWordbookHome(search ? search.value : '');
            });
        }

        var wbBatchExport = document.getElementById('qaq-wordbook-batch-export-btn');
        if (wbBatchExport) {
            wbBatchExport.addEventListener('click', function () {
                window.qaqExportSelectedWordbooks(window.qaqSelectedWordbookIds);
            });
        }

        var wbBatchDelete = document.getElementById('qaq-wordbook-batch-delete-btn');
        if (wbBatchDelete) {
            wbBatchDelete.addEventListener('click', function () {
                if (!window.qaqSelectedWordbookIds.length) return window.qaqToast('请先选择词库');

                window.qaqConfirm('删除词库', '确认删除所选词库吗？', function () {
                    var books = window.qaqGetWordbooks().filter(function (b) {
                        return window.qaqSelectedWordbookIds.indexOf(b.id) === -1;
                    });

                    window.qaqSaveWordbooks(books);
                    var count = window.qaqSelectedWordbookIds.length;
                    window.qaqSelectedWordbookIds = [];
                    window.qaqWordbookSelectMode = false;

                    var search = document.getElementById('qaq-wordbook-search');
                    window.qaqRenderWordbookHome(search ? search.value : '');
                    window.qaqToast('已删除 ' + count + ' 本词库');
                });
            });
        }

        var wordSelectBtn = document.getElementById('qaq-word-entry-select-btn');
        if (wordSelectBtn) {
            wordSelectBtn.addEventListener('click', function () {
                window.qaqWordEntrySelectMode = !window.qaqWordEntrySelectMode;
                if (!window.qaqWordEntrySelectMode) window.qaqSelectedWordIds = [];
                if (window.qaqCurrentWordbookId) {
                    var detailSearch = document.getElementById('qaq-wordbook-detail-search');
                    window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, detailSearch ? detailSearch.value : '');
                }
            });
        }

        var wordBatchCancel = document.getElementById('qaq-word-entry-batch-cancel-btn');
        if (wordBatchCancel) {
            wordBatchCancel.addEventListener('click', function () {
                window.qaqWordEntrySelectMode = false;
                window.qaqSelectedWordIds = [];
                if (window.qaqCurrentWordbookId) {
                    var detailSearch = document.getElementById('qaq-wordbook-detail-search');
                    window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, detailSearch ? detailSearch.value : '');
                }
            });
        }

        var wordSelectAll = document.getElementById('qaq-word-entry-select-all-btn');
        if (wordSelectAll) {
            wordSelectAll.addEventListener('click', function () {
                if (!window.qaqCurrentWordbookId) return;

                var books = window.qaqGetWordbooks();
                var book = books.find(function (b) { return b.id === window.qaqCurrentWordbookId; });
                if (!book) return;

                var items = (book.words || []).slice();
                var detailSearch = document.getElementById('qaq-wordbook-detail-search');
                var kw = detailSearch ? detailSearch.value.trim().toLowerCase() : '';

                if (kw) {
                    items = items.filter(function (item) {
                        return (item.word || '').toLowerCase().indexOf(kw) > -1 ||
                            (item.meaning || '').toLowerCase().indexOf(kw) > -1;
                    });
                }

                if (window.qaqSelectedWordIds.length === items.length) {
                    window.qaqSelectedWordIds = [];
                } else {
                    window.qaqSelectedWordIds = items.map(function (w) { return w.id; });
                }

                window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, detailSearch ? detailSearch.value : '');
            });
        }

        var wordBatchDelete = document.getElementById('qaq-word-entry-batch-delete-btn');
        if (wordBatchDelete) {
            wordBatchDelete.addEventListener('click', function () {
                if (!window.qaqCurrentWordbookId) return;
                if (!window.qaqSelectedWordIds.length) return window.qaqToast('请先选择词条');

                window.qaqConfirm('删除词条', '确认删除所选词条吗？', function () {
                    var books = window.qaqGetWordbooks();
                    var book = books.find(function (b) { return b.id === window.qaqCurrentWordbookId; });
                    if (!book) return;

                    book.words = (book.words || []).filter(function (w) {
                        return window.qaqSelectedWordIds.indexOf(w.id) === -1;
                    });

                    var count = window.qaqSelectedWordIds.length;
                    window.qaqSaveWordbooks(books);
                    window.qaqSelectedWordIds = [];
                    window.qaqWordEntrySelectMode = false;

                    var detailSearch = document.getElementById('qaq-wordbook-detail-search');
                    window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, detailSearch ? detailSearch.value : '');

                    var homeSearch = document.getElementById('qaq-wordbook-search');
                    setTimeout(function () {
                        window.qaqRenderWordbookHome(homeSearch ? homeSearch.value : '');
                    }, 230);

                    window.qaqToast('已删除 ' + count + ' 条词条');
                });
            });
        }

        /* ===== Theme Bindings ===== */
        var wbtBtn = document.getElementById('qaq-wordbank-theme-btn');
        if (wbtBtn) {
            wbtBtn.addEventListener('click', function () {
                window.qaqRenderWordbankThemePage();
                window.qaqSwitchTo(window.qaqWordbankThemePage);
            });
        }

        var wbtBack = document.getElementById('qaq-wordbank-theme-back');
        if (wbtBack) {
            wbtBack.addEventListener('click', function () {
                window.qaqGoBackTo(window.qaqWordbankPage, window.qaqWordbankThemePage);
                window.qaqApplyWordbankTheme();
                window.qaqApplyWordbankCardTheme();
            });
        }

        var wbtAppUpload = document.getElementById('qaq-wbt-app-upload');
        if (wbtAppUpload) {
            wbtAppUpload.addEventListener('click', function () {
                window.qaqEditImage('设置词库 APP 背景', function (src) {
                    var theme = window.qaqGetWordbankTheme();
                    theme.appBg = src;
                    window.qaqSaveWordbankTheme(theme);
                    window.qaqRenderWordbankThemePage();
                    window.qaqApplyWordbankTheme();
                    window.qaqToast('词库背景已设置');
                });
            });
        }

        var wbtAppClear = document.getElementById('qaq-wbt-app-clear');
        if (wbtAppClear) {
            wbtAppClear.addEventListener('click', function () {
                var theme = window.qaqGetWordbankTheme();
                theme.appBg = '';
                window.qaqSaveWordbankTheme(theme);
                window.qaqRenderWordbankThemePage();
                window.qaqApplyWordbankTheme();
                window.qaqToast('词库背景已清除');
            });
        }

        var wbtAppOpacity = document.getElementById('qaq-wbt-app-opacity');
        if (wbtAppOpacity) {
            wbtAppOpacity.addEventListener('input', function () {
                document.getElementById('qaq-wbt-app-opacity-val').textContent = this.value + '%';
                var overlay = document.getElementById('qaq-wbt-app-overlay');
                if (overlay) overlay.style.background = 'rgba(0,0,0,' + (this.value / 100) + ')';
            });

            wbtAppOpacity.addEventListener('change', function () {
                var theme = window.qaqGetWordbankTheme();
                theme.appOpacity = parseInt(this.value, 10);
                window.qaqSaveWordbankTheme(theme);
                window.qaqApplyWordbankTheme();
            });
        }

        var wbtCardUpload = document.getElementById('qaq-wbt-card-upload');
        if (wbtCardUpload) {
            wbtCardUpload.addEventListener('click', function () {
                window.qaqEditImage('设置词库卡片背景', function (src) {
                    var theme = window.qaqGetWordbankTheme();
                    theme.cardBg = src;
                    window.qaqSaveWordbankTheme(theme);
                    window.qaqRenderWordbankThemePage();
                    window.qaqApplyWordbankCardTheme();
                    var search = document.getElementById('qaq-wordbook-search');
                    window.qaqRenderWordbookHome(search ? search.value : '');
                    if (window.qaqCurrentWordbookId) {
                        var detailSearch = document.getElementById('qaq-wordbook-detail-search');
                        window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, detailSearch ? detailSearch.value : '');
                    }
                    window.qaqApplyWordbankCardThemeDebounced();
                    window.qaqToast('卡片背景已设置');
                });
            });
        }

        var wbtCardClear = document.getElementById('qaq-wbt-card-clear');
        if (wbtCardClear) {
            wbtCardClear.addEventListener('click', function () {
                var theme = window.qaqGetWordbankTheme();
                theme.cardBg = '';
                window.qaqSaveWordbankTheme(theme);
                window.qaqRenderWordbankThemePage();
                window.qaqApplyWordbankCardTheme();
                var search = document.getElementById('qaq-wordbook-search');
                window.qaqRenderWordbookHome(search ? search.value : '');
                if (window.qaqCurrentWordbookId) {
                    var detailSearch = document.getElementById('qaq-wordbook-detail-search');
                    window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, detailSearch ? detailSearch.value : '');
                }
                window.qaqApplyWordbankCardThemeDebounced();
                window.qaqToast('卡片背景已清除');
            });
        }

        var wbtCardOpacity = document.getElementById('qaq-wbt-card-opacity');
        if (wbtCardOpacity) {
            wbtCardOpacity.addEventListener('input', function () {
                document.getElementById('qaq-wbt-card-opacity-val').textContent = this.value + '%';
                var overlay = document.getElementById('qaq-wbt-card-overlay');
                if (overlay) {
                    var isDark = document.querySelector('.qaq-phone-frame').classList.contains('qaq-theme-dark');
                    overlay.style.background = isDark
                        ? 'rgba(0,0,0,' + (this.value / 100) + ')'
                        : 'rgba(255,255,255,' + (this.value / 100) + ')';
                }
            });

            wbtCardOpacity.addEventListener('change', function () {
                var theme = window.qaqGetWordbankTheme();
                theme.cardOpacity = parseInt(this.value, 10);
                window.qaqSaveWordbankTheme(theme);
                window.qaqApplyWordbankCardThemeDebounced();
            });
        }

        var wbtReset = document.getElementById('qaq-wbt-reset');
        if (wbtReset) {
            wbtReset.addEventListener('click', function () {
                window.qaqConfirm('恢复默认', '确认恢复词库主题为默认？', function () {
                    localStorage.removeItem('qaq-wordbank-theme');
                    window.qaqCacheInvalidate('qaq-wordbank-theme');
                    window.qaqRenderWordbankThemePage();
                    window.qaqApplyWordbankTheme();

                    var search = document.getElementById('qaq-wordbook-search');
                    window.qaqRenderWordbookHome(search ? search.value : '');

                    if (window.qaqCurrentWordbookId) {
                        var detailSearch = document.getElementById('qaq-wordbook-detail-search');
                        window.qaqRenderWordbookDetail(window.qaqCurrentWordbookId, detailSearch ? detailSearch.value : '');
                    }

                    window.qaqApplyWordbankCardThemeDebounced();
                    window.qaqToast('已恢复默认');
                });
            });
        }
    }
    
    // ===== 导入兜底修复 =====
window.qaqWordId = window.qaqWordId || function() { 
    return 'w_' + Date.now() + Math.random().toString(36).substr(2, 6); 
};
window.qaqWordbookId = window.qaqWordbookId || function() { 
    return 'wb_' + Date.now() + Math.random().toString(36).substr(2, 6); 
};

// 覆盖原有的错误提示，让它能显示具体死在哪一步
if (window.qaqWordbankFileInput) {
    var oldOnChange = window.qaqWordbankFileInput.onchange;
    window.qaqWordbankFileInput.addEventListener('change', function(e) {
        // 通过劫持全局错误处理，把导入失败的具体原因打印出来
        window.addEventListener('unhandledrejection', function(event) {
            if(window.qaqToast) window.qaqToast("导入错误: " + (event.reason.message || "未知原因"));
        }, { once: true });
    });
}

    /* ===== Initial Apply ===== */
    window.qaqApplyWordbankTheme();
    window.qaqApplyWordbankCardTheme();

})();
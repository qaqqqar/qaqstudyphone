(function () {
    'use strict';

    /* ===== Modal Elements ===== */
    window.qaqModalOverlay = document.getElementById('qaq-modal-overlay');
    window.qaqModalTitle = document.getElementById('qaq-modal-title');
    window.qaqModalBody = document.getElementById('qaq-modal-body');
    window.qaqModalBtns = document.getElementById('qaq-modal-btns');
    window.qaqFileInput = document.getElementById('qaq-file-input');

    /* ===== Open / Close ===== */
    window.qaqOpenModal = function () {
        if (!window.qaqModalOverlay) return;
        window.qaqModalOverlay.style.display = '';
        void window.qaqModalOverlay.offsetHeight;
        window.qaqModalOverlay.classList.add('qaq-modal-show');
    };

    window.qaqCloseModal = function () {
        if (!window.qaqModalOverlay) return;

        window.qaqModalOverlay.classList.remove('qaq-modal-show');

        setTimeout(function () {
            if (!window.qaqModalOverlay.classList.contains('qaq-modal-show')) {
                window.qaqModalOverlay.style.display = 'none';
                if (window.qaqModalBody) window.qaqModalBody.innerHTML = '';
                if (window.qaqModalBtns) window.qaqModalBtns.innerHTML = '';
            }
        }, 240);
    };

    /* ===== Overlay Click Close ===== */
    if (window.qaqModalOverlay) {
        window.qaqModalOverlay.addEventListener('click', function (e) {
            if (e.target === window.qaqModalOverlay) {
                window.qaqCloseModal();
            }
        });
    }

    /* ===== Text Edit Modal ===== */
    window.qaqEditText = function (title, currentValue, isMultiline, onSave) {
        if (!window.qaqModalTitle || !window.qaqModalBody || !window.qaqModalBtns) return;

        window.qaqModalTitle.textContent = title || '编辑';

        if (isMultiline) {
            window.qaqModalBody.innerHTML =
                '<textarea class="qaq-modal-textarea" id="qaq-modal-edit-input">' +
                (currentValue || '') +
                '</textarea>';
        } else {
            window.qaqModalBody.innerHTML =
                '<input class="qaq-modal-input" id="qaq-modal-edit-input" type="text" value="' +
                String(currentValue || '').replace(/"/g, '&quot;') +
                '">';
        }

        window.qaqModalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">保存</button>';

        window.qaqOpenModal();

        var input = document.getElementById('qaq-modal-edit-input');
        setTimeout(function () {
            if (input) input.focus();
        }, 100);

        var cancelBtn = document.getElementById('qaq-modal-cancel');
        var confirmBtn = document.getElementById('qaq-modal-confirm');

        if (cancelBtn) {
            cancelBtn.onclick = window.qaqCloseModal;
        }

        if (confirmBtn) {
            confirmBtn.onclick = function () {
                var val = input ? input.value.trim() : '';
                if (val) {
                    if (typeof onSave === 'function') onSave(val);
                    if (window.qaqToast) window.qaqToast('已保存');
                }
                window.qaqCloseModal();
            };
        }
    };

    /* ===== Image Edit Modal ===== */
    window.qaqEditImage = function (title, onImageSet) {
        if (!window.qaqModalTitle || !window.qaqModalBody || !window.qaqModalBtns) return;

        window.qaqModalTitle.textContent = title || '更换图片';

        window.qaqModalBody.innerHTML =
            '<div class="qaq-modal-upload-options">' +
                '<button class="qaq-modal-upload-btn" id="qaq-upload-url-btn">URL 链接上传</button>' +
                '<button class="qaq-modal-upload-btn" id="qaq-upload-local-btn">本地图片上传</button>' +
            '</div>' +
            '<div class="qaq-modal-url-area" id="qaq-url-area">' +
                '<input class="qaq-modal-input" id="qaq-url-input" type="text" placeholder="请输入图片URL...">' +
                '<div class="qaq-modal-btns">' +
                    '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-url-cancel">取消</button>' +
                    '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-url-confirm">确定</button>' +
                '</div>' +
            '</div>';

        window.qaqModalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';

        window.qaqOpenModal();

        var closeBtn = document.getElementById('qaq-modal-cancel');
        if (closeBtn) {
            closeBtn.onclick = window.qaqCloseModal;
        }

        var urlBtn = document.getElementById('qaq-upload-url-btn');
        var localBtn = document.getElementById('qaq-upload-local-btn');

        if (urlBtn) {
            urlBtn.onclick = function () {
                var uploadOptions = document.querySelector('.qaq-modal-upload-options');
                var urlArea = document.getElementById('qaq-url-area');
                var modalCancel = document.getElementById('qaq-modal-cancel');

                if (uploadOptions) uploadOptions.style.display = 'none';
                if (modalCancel && modalCancel.parentElement) {
                    modalCancel.parentElement.style.display = 'none';
                }
                if (urlArea) urlArea.classList.add('qaq-url-show');

                var urlCancel = document.getElementById('qaq-url-cancel');
                var urlConfirm = document.getElementById('qaq-url-confirm');

                if (urlCancel) {
                    urlCancel.onclick = window.qaqCloseModal;
                }

                if (urlConfirm) {
                    urlConfirm.onclick = function () {
                        var urlInput = document.getElementById('qaq-url-input');
                        var url = urlInput ? urlInput.value.trim() : '';

                        if (url) {
                            if (typeof onImageSet === 'function') onImageSet(url);
                            if (window.qaqToast) window.qaqToast('图片已更新');
                        }

                        window.qaqCloseModal();
                    };
                }
            };
        }

        if (localBtn) {
            localBtn.onclick = function () {
                if (!window.qaqFileInput) return;

                window.qaqFileInput.onchange = function () {
                    if (this.files && this.files[0]) {
                        var reader = new FileReader();

                        reader.onload = function (e) {
                            if (typeof onImageSet === 'function') onImageSet(e.target.result);
                            if (window.qaqToast) window.qaqToast('图片已更新');
                        };

                        reader.readAsDataURL(this.files[0]);
                    }

                    window.qaqFileInput.value = '';
                    window.qaqCloseModal();
                };

                window.qaqFileInput.click();
            };
        }
    };

    /* ===== Confirm Modal ===== */
    window.qaqConfirm = function (title, message, onConfirm) {
        if (!window.qaqModalTitle || !window.qaqModalBody || !window.qaqModalBtns) return;

        window.qaqModalTitle.textContent = title || '确认';

        window.qaqModalBody.innerHTML =
            '<div style="font-size:13px;color:#666;line-height:1.6;text-align:center;">' +
            (message || '') +
            '</div>';

        window.qaqModalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm" style="background:#d9534f;color:#fff;">确认</button>';

        window.qaqOpenModal();

        var cancelBtn = document.getElementById('qaq-modal-cancel');
        var confirmBtn = document.getElementById('qaq-modal-confirm');

        if (cancelBtn) {
            cancelBtn.onclick = window.qaqCloseModal;
        }

        if (confirmBtn) {
            confirmBtn.onclick = function () {
                if (typeof onConfirm === 'function') onConfirm();
                window.qaqCloseModal();
            };
        }
    };

})();
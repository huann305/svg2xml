document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('output');
    const buttonDownloadFile = document.getElementById('buttonDownloadFile');
    const buttonCopyText = document.getElementById('buttonCopyText');
    const input = document.getElementById('input');

    let xmlContent = "";

    function updateButtonState(button, success, message, text) {
        button.textContent = message;
        button.style.backgroundColor = success ? "green" : "red";
        setTimeout(() => {
            button.textContent = text;
            button.style.backgroundColor = "";
        }, 1000);
    }

    function splitSVGPath(path) {
        return path.split('M');
    }

    class Path {
        constructor(pathData, strokeWidth, fillColor, fillType, strokeColor, strokeType, strokeLineCap, name, className, alpha) {
            this.pathData = pathData;
            this.strokeWidth = strokeWidth;
            this.fillColor = fillColor;
            this.fillType = fillType;
            this.strokeColor = strokeColor;
            this.strokeType = strokeType;
            this.strokeLineCap = strokeLineCap;
            this.name = name;
            this.className = className;
            this.alpha = alpha;
        }
    }

    function parseStyle(styleContent) {
        const resultArray = [];
        const styles = styleContent.replace(/\s+/g, '').replace(/{/g, '==').split('}');
        styles.forEach(styleBlock => {
            if (styleBlock) {
                const [keys, value] = styleBlock.split('==');
                keys.replace(/\.+/g, '').split(',').forEach(key => {
                    resultArray.push({ key, value });
                });
            }
        });
        return resultArray;
    }

    function parsePaths(paths, styleRules) {
        return Array.from(paths).map(path => {
            let pathData = path.getAttribute('d');
            let strokeWidth = path.getAttribute('stroke-width');
            let fillColor = path.getAttribute('fill');
            let fillType = path.getAttribute('fill-rule');
            let strokeColor = path.getAttribute('stroke');
            let strokeType = path.getAttribute('stroke-linecap');
            let strokeLineCap = path.getAttribute('stroke-linejoin');
            let name = path.getAttribute('id');
            let className = path.getAttribute('class');
            let alpha = "1";

            styleRules.forEach(({ key, value }) => {
                if (key === className) {
                    value.split(';').forEach(style => {
                        const [property, colorValue] = style.split(':');
                        if (property === 'fill') fillColor = colorValue;
                        if (property === 'opacity') alpha = colorValue;
                        if (property === 'stroke') strokeColor = colorValue;
                    });
                }
            });

            return new Path(pathData, strokeWidth, fillColor, fillType, strokeColor, strokeType, strokeLineCap, name, className, alpha);
        });
    }

    function generateXMLContent(listPath, width, height) {
        const pathContent = listPath.map(path => {
            return `<path ${path.name ? `android:name="${path.name}"` : ''}
                android:pathData="${path.pathData}"
                android:fillColor="${path.fillColor === "none" ? "#000" : path.fillColor || "#000"}"
                android:fillType="evenOdd"
                android:fillAlpha="${path.alpha}"/>`;
        }).join('\n');

        return `<vector xmlns:android="http://schemas.android.com/apk/res/android"
            android:width="${width}dp"
            android:height="${height}dp"
            android:viewportWidth="${width}"
            android:viewportHeight="${height}">
            ${pathContent}
        </vector>`;
    }

    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.style.borderColor = 'green';
    });

    dropZone.addEventListener('dragleave', (event) => {
        event.preventDefault();
        dropZone.style.borderColor = 'red';
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.style.borderColor = '#000';
        const files = event.dataTransfer.files;

        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'image/svg+xml') {
                input.value = file.name.replace('.svg', '.xml').toLowerCase().replace(/\s+/g, '').replace(/[^a-zA-Z0-9.]/g, '_');
                const reader = new FileReader();
                reader.onload = function (e) {
                    const svgContent = e.target.result;
                    dropZone.innerHTML = svgContent;
                    const paths = output.getElementsByTagName('path');
                    const style = output.getElementsByTagName('style')[0];
                    const svg = output.getElementsByTagName('svg')[0];
                    let width = svg.getAttribute('width');
                    let height = svg.getAttribute('height');
                    const styleRules = style ? parseStyle(style.textContent) : [];

                    const listPath = parsePaths(paths, styleRules);

                    if (!width || !height) {
                        const viewBox = svg.getAttribute('viewBox').split(' ');
                        width = viewBox[2];
                        height = viewBox[3];
                    }

                    xmlContent = generateXMLContent(listPath, width, height);
                };
                reader.readAsText(file);
            } else {
                alert('Vui lòng thả tệp SVG.');
            }
        }
    });

    buttonCopyText.addEventListener('click', () => {
        if (xmlContent) {
            navigator.clipboard.writeText(xmlContent)
                .then(() => updateButtonState(buttonCopyText, true, "Copy success", "Copy text"))
                .catch(() => updateButtonState(buttonCopyText, false, "Copy failed", "Copy text"));
        } else {
            alert('Vui lòng chọn và đọc tệp XML trước.');
        }
    });

    buttonDownloadFile.addEventListener('click', () => {
        if (xmlContent) {
            const blob = new Blob([xmlContent], { type: 'application/xml' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${input.value}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            updateButtonState(buttonDownloadFile, true, "Download success", "Download file");
        } else {
            updateButtonState(buttonDownloadFile, false, "Download failed", "Download file");
        }
    });
});

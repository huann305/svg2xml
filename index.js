document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('output');
    const previewContainer = document.getElementById('previewContainer');
    const buttonDownloadFile = document.getElementById('buttonDownloadFile');
    const buttonDownloadFile2 = document.getElementById('buttonDownloadFile2');
    const buttonCopyText = document.getElementById('buttonCopyText');
    const buttonCopyText2 = document.getElementById('buttonCopyText2');

    let xmlContents = [];

    function updateButtonState(button, success, message, text) {
        button.textContent = message;
        button.style.backgroundColor = success ? "green" : "red";
        setTimeout(() => {
            button.textContent = text;
            button.style.backgroundColor = "";
        }, 1000);
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
            let alpha = path.getAttribute('opacity') || '1';

            styleRules.forEach(({ key, value }) => {
                if (key === className) {
                    value.split(';').forEach(style => {
                        const [property, colorValue] = style.split(':');
                        if (property === 'fill') fillColor = colorValue;
                        if (property === 'opacity') alpha = colorValue;
                        if (property === 'stroke') strokeColor = colorValue;
                        if (property === 'stroke-width') strokeWidth = colorValue;
                        if (property === 'stroke-linecap') strokeType = colorValue;
                        if (property === 'stroke-linejoin') strokeLineCap = colorValue;
                        if (property === 'fill-rule') fillType = colorValue;
                        if (property === 'id') name = colorValue;
                        if (property === 'class') className = colorValue;
                    });
                }
            });

            fillColor = convertColorNameToHex(fillColor);

            if (fillColor == null) {
                const temp = path.style.fill;
                fillColor = rgbToHex(temp);
                // console.log(fillColor);
            }

            return new Path(pathData, strokeWidth, fillColor, fillType, strokeColor, strokeType, strokeLineCap, name, className, alpha);
        });
    }

    function generateXMLContent(listPath, width, height) {
        const pathContent = listPath.map(path => {
            return `<path ${path.name ? `android:name="${path.name}"` : ''}
                android:pathData="${path.pathData}"
                android:fillColor="${path.fillColor === "none" ? "#000000" : path.fillColor || "#000000"}"
                android:fillType="evenOdd"${path.strokeColor ? `\nandroid:strokeColor="${path.strokeColor}"` : ''}${path.strokeWidth ? `\nandroid:strokeWidth="${path.strokeWidth}"` : ''}${path.strokeLineCap ? `\nandroid:strokeLineCap="${path.strokeLineCap}"` : ''}${path.strokeType ? `\nandroid:strokeLineJoin="${path.strokeType}"` : ''}${path.alpha != '1' ? `\nandroid:fillAlpha="${path.alpha}"` : ''}${path.alpha != '1' ? `\nandroid:strokeAlpha="${path.alpha}"` : ''}/>`;
        }).join('\n');

        return `<?xml version="1.0" encoding="utf-8"?>
        <vector xmlns:android="http://schemas.android.com/apk/res/android"
            android:width="${width}dp"
            android:height="${height}dp"
            android:viewportWidth="${width}"
            android:viewportHeight="${height}">
<!--    // <path-->
<!--    //     android:pathData="M0 0 H594 V841 H0 Z"-->
<!--    //     android:fillColor="#FFFFFF"/>-->
            ${pathContent}
        </vector>`;
    }

    let count = 0;

    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        // dropZone.style.background = 'green';
    });

    dropZone.addEventListener('dragleave', (event) => {
        event.preventDefault();
        // dropZone.style.background = 'red';
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        // dropZone.style.background = '';
        const files = event.dataTransfer.files;

        if (files.length > 1) {
            buttonCopyText.style.display = 'none';
            buttonCopyText2.style.display = 'none';
        }
        if (files.length > 0) {
            xmlContents = [];
            // previewContainer.innerHTML = '';
            Array.from(files).forEach(file => {
                if (file.type === 'image/svg+xml') {
                    let fileName = file.name.replace('.svg', '.xml').toLowerCase().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9.]/g, '_');
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const svgContent = e.target.result;
                        const svgElement = new DOMParser().parseFromString(svgContent, 'image/svg+xml').documentElement;

                        if (svgElement.tagName !== 'svg') {
                            // console.error('Invalid SVG content');
                            return;
                        }

                        const svgPreview = document.createElement('div');
                        svgPreview.style.display = 'inline-block';
                        svgPreview.appendChild(document.createElement('div'));
                        svgPreview.innerHTML += new XMLSerializer().serializeToString(svgElement);
                        svgPreview.style.width = '200px';
                        svgPreview.style.height = 'auto';
                        svgPreview.style.border = '1px solid #ccc';
                        svgPreview.style.margin = '10px';
                        svgPreview.style.padding = '10px';

                        const deleteButton = document.createElement('button');
                        deleteButton.textContent = 'Xóa';
                        deleteButton.addEventListener('click', () => {
                            previewContainer.removeChild(svgPreview);
                            xmlContents = xmlContents.filter(content => content.fileName !== fileName);
                        });

                        const downloadButton = document.createElement('button');
                        downloadButton.textContent = 'Tải xuống';
                        downloadButton.addEventListener('click', () => {
                            const content = xmlContents.find(content => content.fileName === fileName);
                            if (content) {
                                updateButtonState(downloadButton, true, "Tải xuống thành công", "Tải xuống")
                                const blob = new Blob([content.xmlContent], { type: 'application/xml' });
                                const url = URL.createObjectURL(blob);

                                const link = document.createElement('a');
                                link.href = url;
                                link.download = content.fileName;

                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);

                                URL.revokeObjectURL(url);
                            } else {
                                updateButtonState(downloadButton, false, "Tải xuống thất bại", "Tải xuống")
                            }
                        });

                        const copyButton = document.createElement('button');
                        copyButton.textContent = 'Sao chép';
                        copyButton.addEventListener('click', () => {
                            const content = xmlContents.find(content => content.fileName === fileName);
                            if (content) {
                                navigator.clipboard.writeText(content.xmlContent)
                                    .then(() => updateButtonState(copyButton, true, "Sao chép thành công", "Sao chép"))
                                    .catch(() => updateButtonState(copyButton, false, "Sao chép thất bại", "Sao chép"));
                            }
                        });

                        const fileNameImg = document.createElement('input');
                        fileNameImg.value = fileName;
                        fileNameImg.addEventListener('change', () => {
                            xmlContents.forEach(content => {
                                if (content.fileName === fileName) {
                                    fileName = fileNameImg.value;
                                    content.fileName = fileName;
                                }
                            });
                        });

                        let fileNameImgContainer = document.createElement('div');

                        fileNameImgContainer.appendChild(fileNameImg);
                        fileNameImgContainer.appendChild(downloadButton);
                        fileNameImgContainer.appendChild(copyButton);
                        fileNameImgContainer.appendChild(deleteButton);

                        fileNameImgContainer.style.display = 'flex';
                        fileNameImgContainer.style.justifyContent = "space-between";
                        fileNameImgContainer.style.flexDirection = 'column';
                        fileNameImgContainer.style.alignItems = 'center';

                        for (let i = 0; i < fileNameImgContainer.children.length; i++) {
                            fileNameImgContainer.children[i].style.width = i == 0 ? '90%' : '100%';
                            fileNameImgContainer.children[i].style.height = 'auto';
                        }
                        for (let i = 0; i < svgPreview.children.length; i++) {
                            svgPreview.children[i].style.width = '100%';
                            svgPreview.children[i].style.height = 'auto';
                        }

                        svgPreview.style.display = 'flex';
                        svgPreview.style.flexDirection = 'column';
                        svgPreview.style.justifyContent = 'space-between';

                        svgPreview.appendChild(fileNameImgContainer);

                        previewContainer.appendChild(svgPreview);

                        const circles = svgElement.getElementsByTagName('circle');
                        const ellipses = svgElement.getElementsByTagName('ellipse');

                        const style = svgElement.getElementsByTagName('style')[0];
                        let width = svgElement.getAttribute('width');
                        let height = svgElement.getAttribute('height');
                        const styleRules = style ? parseStyle(style.textContent) : [];


                        for (let i = 0; i < circles.length; i++) {
                            svgElement.appendChild(convertCircleToPath(circles[i]));
                        }
                        for (let i = 0; i < ellipses.length; i++) {
                            // svgElement.appendChild(convertEllipseToPath(ellipses[i].outerHTML));
                            console.log(convertEllipseToPath(ellipses[i].outerHTML))
                        }
                        const paths = svgElement.getElementsByTagName('path');

                        for (let i = 0; i < paths.length; i++) {
                            // console.log(paths[i]);
                        }

                        const listPath = parsePaths(paths, styleRules);

                        const viewBox = svgElement.getAttribute('viewBox');
                        if (viewBox) {
                            const viewBoxValues = viewBox.split(' ');
                            width = viewBoxValues[2];
                            height = viewBoxValues[3];
                        }

                        const xmlContent = generateXMLContent(listPath, width, height);
                        xmlContents.push({ fileName, xmlContent });
                    };
                    reader.readAsText(file);
                }
            });
        }
    });

    buttonCopyText.addEventListener('click', () => {
        if (xmlContents.length > 0) {
            const combinedXMLContent = xmlContents.map(content => content.xmlContent).join('\n\n');
            navigator.clipboard.writeText(combinedXMLContent)
                .then(() => updateButtonState(buttonCopyText, true, "Sao chép thành công", "Sao chép"))
                .catch(() => updateButtonState(buttonCopyText, false, "Sao chép thất bại", "Sao chép"));
        } else {
            alert('Vui lòng chọn và đọc tệp XML trước.');
        }
    });

    buttonCopyText2.addEventListener('click', () => {
        if (xmlContents.length > 0) {
            const combinedXMLContent = xmlContents.map(content => content.xmlContent).join('\n\n');
            navigator.clipboard.writeText(combinedXMLContent)
                .then(() => updateButtonState(buttonCopyText2, true, "Sao chép thành công", "Sao chép"))
                .catch(() => updateButtonState(buttonCopyText2, false, "Sao chép thất bại", "Sao chép"));
        } else {
            alert('Vui lòng chọn và đọc tệp XML trước.');
        }
    });

    buttonDownloadFile.addEventListener('click', () => {
        if (xmlContents.length > 0) {
            xmlContents.forEach(({ fileName, xmlContent }) => {
                const blob = new Blob([xmlContent], { type: 'application/xml' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
            updateButtonState(buttonDownloadFile, true, "Tải xuống thành công", "Tải xuống");
        } else {
            updateButtonState(buttonDownloadFile, false, "Tải xuống thất bại", "Tải xuống");
        }
    });
    buttonDownloadFile2.addEventListener('click', () => {
        if (xmlContents.length > 0) {
            xmlContents.forEach(({ fileName, xmlContent }) => {
                const blob = new Blob([xmlContent], { type: 'application/xml' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
            updateButtonState(buttonDownloadFile2, true, "Tải xuống thành công", "Tải xuống");
        } else {
            updateButtonState(buttonDownloadFile2, false, "Tải xuống thất bại", "Tải xuống");
        }
    });
});

function convertEllipseToPath(ellipseTag) {
    // Kiểm tra xem ellipseTag có phải là chuỗi không
    if (typeof ellipseTag !== 'string') {
        throw new TypeError('Input must be a string');
    }

    // Biểu thức chính quy để trích xuất thuộc tính từ thẻ ellipse với namespace
    const regex = /<ellipse\s+xmlns="[^"]*"\s+style="[^"]*"\s+cx="([^"]*)"\s+cy="([^"]*)"\s+rx="([^"]*)"\s+ry="([^"]*)"(?:\s+transform="matrix\(([^)]+)\)")?\s*\/>/;
    const match = ellipseTag.match(regex);

    if (!match) {
        throw new Error('Invalid ellipse tag format');
    }

    const cx = parseFloat(match[1]);
    const cy = parseFloat(match[2]);
    const rx = parseFloat(match[3]);
    const ry = parseFloat(match[4]);
    const matrix = match[5] ? match[5].split(',').map(Number) : [1, 0, 0, 1, 0, 0]; // Matrix mặc định nếu không có transform

    // Matrix parameters
    const [a, b, c, d, e, f] = matrix;

    // Function to apply matrix transform to a point
    function applyMatrix(x, y) {
        const xPrime = a * x + c * y + e;
        const yPrime = b * x + d * y + f;
        return [xPrime, yPrime];
    }

    // Ellipse points
    const points = [
        { x: cx + rx, y: cy },          // Right point
        { x: cx - rx, y: cy },          // Left point
        { x: cx, y: cy + ry },          // Bottom point
        { x: cx, y: cy - ry }           // Top point
    ];

    // Apply matrix transformation to ellipse points
    const transformedPoints = points.map(point => applyMatrix(point.x, point.y));

    // Generate path data
    const pathData = [
        `M ${transformedPoints[0][0]},${transformedPoints[0][1]}`, // Move to right point
        `A ${rx},${ry} 0 1 0 ${transformedPoints[1][0]},${transformedPoints[1][1]}`, // Arc to left point
        `A ${rx},${ry} 0 1 0 ${transformedPoints[2][0]},${transformedPoints[2][1]}`, // Arc to bottom point
        `A ${rx},${ry} 0 1 0 ${transformedPoints[3][0]},${transformedPoints[3][1]}`, // Arc to top point
        `Z` // Close path
    ].join(' ');

    return pathData;
}

function convertCircleToPath(circle) {
    // Lấy các thuộc tính từ thẻ circle
    const cx = parseFloat(circle.getAttribute("cx"));
    const cy = parseFloat(circle.getAttribute("cy"));
    const r = parseFloat(circle.getAttribute("r"));
    const style = circle.getAttribute("style");

    // Tính toán các giá trị cần thiết cho thẻ path
    const d = `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 -${2 * r},0`;

    // Tạo thẻ path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("style", style);
    path.setAttribute("d", d);

    return path;
}
function rgbToHex(rgb) {
    if (!rgb) return;
    const [r, g, b] = rgb
        .replace(/^rgb\(|\s+|\)$/g, '') // Loại bỏ 'rgb(', ')', và khoảng trắng
        .split(',')
        .map(Number); // Chuyển các giá trị thành số

    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        throw new Error('RGB values must be between 0 and 255');
    }

    const toHex = (value) => value.toString(16).padStart(2, '0').toUpperCase();

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function convertColorNameToHex(colorName) {
    const colorMap = {
        "aliceblue": "#f0f8ff",
        "antiquewhite": "#faebd7",
        "aqua": "#00ffff",
        "aquamarine": "#7fffd4",
        "azure": "#f0ffff",
        "beige": "#f5f5dc",
        "bisque": "#ffe4c4",
        "black": "#000000",
        "blanchedalmond": "#ffebcd",
        "blue": "#0000ff",
        "blueviolet": "#8a2be2",
        "brown": "#a52a2a",
        "burlywood": "#deb887",
        "cadetblue": "#5f9ea0",
        "chartreuse": "#7fff00",
        "chocolate": "#d2691e",
        "coral": "#ff7f50",
        "cornflowerblue": "#6495ed",
        "cornsilk": "#fff8dc",
        "crimson": "#dc143c",
        "cyan": "#00ffff",
        "darkblue": "#00008b",
        "darkcyan": "#008b8b",
        "darkgoldenrod": "#b8860b",
        "darkgray": "#a9a9a9",
        "darkgrey": "#a9a9a9",
        "darkgreen": "#006400",
        "darkkhaki": "#bdb76b",
        "darkmagenta": "#8b008b",
        "darkolivegreen": "#556b2f",
        "darkorange": "#ff8c00",
        "darkorchid": "#9932cc",
        "darkred": "#8b0000",
        "darksalmon": "#e9967a",
        "darkseagreen": "#8fbc8f",
        "darkslateblue": "#483d8b",
        "darkslategray": "#2f4f4f",
        "darkslategrey": "#2f4f4f",
        "darkturquoise": "#00ced1",
        "darkviolet": "#9400d3",
        "deeppink": "#ff1493",
        "deepskyblue": "#00bfff",
        "dimgray": "#696969",
        "dimgrey": "#696969",
        "dodgerblue": "#1e90ff",
        "firebrick": "#b22222",
        "floralwhite": "#fffaf0",
        "forestgreen": "#228b22",
        "fuchsia": "#ff00ff",
        "gainsboro": "#dcdcdc",
        "ghostwhite": "#f8f8ff",
        "gold": "#ffd700",
        "goldenrod": "#daa520",
        "gray": "#808080",
        "grey": "#808080",
        "green": "#008000",
        "greenyellow": "#adff2f",
        "honeydew": "#f0fff0",
        "hotpink": "#ff69b4",
        "indianred": "#cd5c5c",
        "indigo": "#4b0082",
        "ivory": "#fffff0",
        "khaki": "#f0e68c",
        "lavender": "#e6e6fa",
        "lavenderblush": "#fff0f5",
        "lawngreen": "#7cfc00",
        "lemonchiffon": "#fffacd",
        "lightblue": "#add8e6",
        "lightcoral": "#f08080",
        "lightcyan": "#e0ffff",
        "lightgoldenrodyellow": "#fafad2",
        "lightgray": "#d3d3d3",
        "lightgrey": "#d3d3d3",
        "lightgreen": "#90ee90",
        "lightpink": "#ffb6c1",
        "lightsalmon": "#ffa07a",
        "lightseagreen": "#20b2aa",
        "lightskyblue": "#87cefa",
        "lightslategray": "#778899",
        "lightslategrey": "#778899",
        "lightsteelblue": "#b0c4de",
        "lightyellow": "#ffffe0",
        "lime": "#00ff00",
        "limegreen": "#32cd32",
        "linen": "#faf0e6",
        "magenta": "#ff00ff",
        "maroon": "#800000",
        "mediumaquamarine": "#66cdaa",
        "mediumblue": "#0000cd",
        "mediumorchid": "#ba55d3",
        "mediumpurple": "#9370db",
        "mediumseagreen": "#3cb371",
        "mediumslateblue": "#7b68ee",
        "mediumspringgreen": "#00fa9a",
        "mediumturquoise": "#48d1cc",
        "mediumvioletred": "#c71585",
        "midnightblue": "#191970",
        "mintcream": "#f5fffa",
        "mistyrose": "#ffe4e1",
        "moccasin": "#ffe4b5",
        "navajowhite": "#ffdead",
        "navy": "#000080",
        "oldlace": "#fdf5e6",
        "olive": "#808000",
        "olivedrab": "#6b8e23",
        "orange": "#ffa500",
        "orangered": "#ff4500",
        "orchid": "#da70d6",
        "palegoldenrod": "#eee8aa",
        "palegreen": "#98fb98",
        "paleturquoise": "#afeeee",
        "palevioletred": "#db7093",
        "papayawhip": "#ffefd5",
        "peachpuff": "#ffdab9",
        "peru": "#cd853f",
        "pink": "#ffc0cb",
        "plum": "#dda0dd",
        "powderblue": "#b0e0e6",
        "purple": "#800080",
        "rebeccapurple": "#663399",
        "red": "#ff0000",
        "rosybrown": "#bc8f8f",
        "royalblue": "#4169e1",
        "saddlebrown": "#8b4513",
        "salmon": "#fa8072",
        "sandybrown": "#f4a460",
        "seagreen": "#2e8b57",
        "seashell": "#fff5ee",
        "sienna": "#a0522d",
        "silver": "#c0c0c0",
        "skyblue": "#87ceeb",
        "slateblue": "#6a5acd",
        "slategray": "#708090",
        "slategrey": "#708090",
        "snow": "#fffafa",
        "springgreen": "#00ff7f",
        "steelblue": "#4682b4",
        "tan": "#d2b48c",
        "teal": "#008080",
        "thistle": "#d8bfd8",
        "tomato": "#ff6347",
        "turquoise": "#40e0d0",
        "violet": "#ee82ee",
        "wheat": "#f5deb3",
        "white": "#ffffff",
        "whitesmoke": "#f5f5f5",
        "yellow": "#ffff00",
        "yellowgreen": "#9acd32"
    };

    if (colorName == null) return null;

    return colorMap[colorName.toLowerCase()] || colorName;
}

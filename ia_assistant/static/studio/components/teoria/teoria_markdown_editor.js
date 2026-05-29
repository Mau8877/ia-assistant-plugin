(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    function getMarkdownBasic() {
        return window.IAAssistant.MarkdownBasic || {
            normalizeMarkdown: function (markdown) {
                return typeof markdown === "string" ? markdown : "";
            },
            isHeading: function () {
                return false;
            },
            getHeadingLevel: function () {
                return 0;
            },
            getHeadingText: function (line) {
                return String(line || "");
            },
            isHorizontalRule: function () {
                return false;
            },
            isBulletListItem: function () {
                return false;
            },
            getBulletListText: function (line) {
                return String(line || "");
            },
            isNumberedListItem: function () {
                return false;
            },
            getNumberedListText: function (line) {
                return String(line || "");
            },
            isQuote: function () {
                return false;
            },
            getQuoteText: function (line) {
                return String(line || "");
            },
            isCodeFence: function () {
                return false;
            },
            parseInlineTokens: function (text) {
                return [{ type: "text", text: String(text || "") }];
            }
        };
    }

    function clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    function createTextElement(tagName, text) {
        var element = document.createElement(tagName);

        element.textContent = text;

        return element;
    }

    function appendInlineNodes(parent, text) {
        var markdownBasic = getMarkdownBasic();

        markdownBasic.parseInlineTokens(text).forEach(function (token) {
            var element;

            if (token.type === "bold") {
                element = createTextElement("strong", token.text);
                parent.appendChild(element);
                return;
            }

            if (token.type === "italic") {
                element = createTextElement("em", token.text);
                parent.appendChild(element);
                return;
            }

            if (token.type === "code") {
                element = createTextElement("code", token.text);
                parent.appendChild(element);
                return;
            }

            parent.appendChild(document.createTextNode(token.text));
        });
    }

    function appendParagraph(container, lines) {
        var paragraph = document.createElement("p");

        appendInlineNodes(paragraph, lines.join(" "));
        container.appendChild(paragraph);
    }

    function appendList(container, items, ordered) {
        var list = document.createElement(ordered ? "ol" : "ul");

        items.forEach(function (itemText) {
            var item = document.createElement("li");

            appendInlineNodes(item, itemText);
            list.appendChild(item);
        });

        container.appendChild(list);
    }

    function renderMarkdownToVisual(container, markdown) {
        var markdownBasic = getMarkdownBasic();
        var lines = markdownBasic.normalizeMarkdown(markdown).split("\n");
        var paragraphLines = [];
        var codeLines = [];
        var inCodeBlock = false;
        var index = 0;

        function flushParagraph() {
            if (paragraphLines.length) {
                appendParagraph(container, paragraphLines);
                paragraphLines = [];
            }
        }

        clearElement(container);

        while (index < lines.length) {
            var line = lines[index];
            var trimmedLine = line.trim();
            var heading;
            var headingLevel;
            var quote;
            var codeBlock;
            var code;
            var listItems;

            if (markdownBasic.isCodeFence(line)) {
                flushParagraph();
                if (inCodeBlock) {
                    codeBlock = document.createElement("pre");
                    code = createTextElement("code", codeLines.join("\n"));
                    codeBlock.appendChild(code);
                    container.appendChild(codeBlock);
                    codeLines = [];
                    inCodeBlock = false;
                } else {
                    inCodeBlock = true;
                }
                index += 1;
                continue;
            }

            if (inCodeBlock) {
                codeLines.push(line);
                index += 1;
                continue;
            }

            if (!trimmedLine) {
                flushParagraph();
                index += 1;
                continue;
            }

            if (markdownBasic.isHorizontalRule(line)) {
                flushParagraph();
                container.appendChild(document.createElement("hr"));
                index += 1;
                continue;
            }

            if (markdownBasic.isHeading(line)) {
                flushParagraph();
                headingLevel = markdownBasic.getHeadingLevel(line);
                heading = document.createElement("h" + headingLevel);
                appendInlineNodes(heading, markdownBasic.getHeadingText(line));
                container.appendChild(heading);
                index += 1;
                continue;
            }

            if (markdownBasic.isQuote(line)) {
                flushParagraph();
                quote = document.createElement("blockquote");
                appendInlineNodes(quote, markdownBasic.getQuoteText(line));
                container.appendChild(quote);
                index += 1;
                continue;
            }

            if (markdownBasic.isBulletListItem(line)) {
                flushParagraph();
                listItems = [];
                while (index < lines.length && markdownBasic.isBulletListItem(lines[index])) {
                    listItems.push(markdownBasic.getBulletListText(lines[index]));
                    index += 1;
                }
                appendList(container, listItems, false);
                continue;
            }

            if (markdownBasic.isNumberedListItem(line)) {
                flushParagraph();
                listItems = [];
                while (index < lines.length && markdownBasic.isNumberedListItem(lines[index])) {
                    listItems.push(markdownBasic.getNumberedListText(lines[index]));
                    index += 1;
                }
                appendList(container, listItems, true);
                continue;
            }

            paragraphLines.push(line);
            index += 1;
        }

        flushParagraph();

        if (!container.childNodes.length) {
            container.appendChild(document.createElement("p"));
        }
    }

    function serializeInlineNode(node) {
        var tagName;
        var content;

        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || "";
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return "";
        }

        tagName = node.tagName.toLowerCase();
        content = serializeInlineChildren(node);

        if (tagName === "strong" || tagName === "b") {
            return "**" + content + "**";
        }

        if (tagName === "em" || tagName === "i") {
            return "*" + content + "*";
        }

        if (tagName === "code" && node.parentElement && node.parentElement.tagName.toLowerCase() !== "pre") {
            return "`" + node.textContent + "`";
        }

        if (tagName === "br") {
            return "\n";
        }

        return content || node.textContent || "";
    }

    function serializeInlineChildren(element) {
        var text = "";

        Array.prototype.forEach.call(element.childNodes, function (childNode) {
            text += serializeInlineNode(childNode);
        });

        return text;
    }

    function serializeBlock(element, index) {
        var tagName = element.tagName.toLowerCase();
        var text = serializeInlineChildren(element).trim();
        var codeElement;

        if (tagName === "h1") {
            return text ? "# " + text : "";
        }

        if (tagName === "h2") {
            return text ? "## " + text : "";
        }

        if (tagName === "h3") {
            return text ? "### " + text : "";
        }

        if (tagName === "blockquote") {
            return text ? "> " + text : "";
        }

        if (tagName === "li") {
            return (index + 1) + ". " + text;
        }

        if (tagName === "pre") {
            codeElement = element.querySelector("code");
            return "```text\n" + (codeElement ? codeElement.textContent : element.textContent) + "\n```";
        }

        if (tagName === "hr") {
            return "---";
        }

        return text;
    }

    function serializeList(listElement) {
        var ordered = listElement.tagName.toLowerCase() === "ol";
        var lines = [];

        Array.prototype.forEach.call(listElement.children, function (item, index) {
            if (item.tagName && item.tagName.toLowerCase() === "li") {
                lines.push((ordered ? (index + 1) + ". " : "- ") + serializeInlineChildren(item).trim());
            }
        });

        return lines.join("\n");
    }

    function serializeVisualToMarkdown(container) {
        var blocks = [];

        Array.prototype.forEach.call(container.childNodes, function (node, index) {
            var tagName;
            var markdown;

            if (node.nodeType === Node.TEXT_NODE) {
                markdown = node.textContent.trim();
                if (markdown) {
                    blocks.push(markdown);
                }
                return;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            tagName = node.tagName.toLowerCase();
            markdown = tagName === "ul" || tagName === "ol" ?
                serializeList(node) :
                serializeBlock(node, index);

            if (markdown) {
                blocks.push(markdown);
            }
        });

        return blocks.join("\n\n");
    }

    function getSelectionRange(container) {
        var selection = window.getSelection();

        if (!selection || !selection.rangeCount) {
            return null;
        }

        if (!container.contains(selection.anchorNode)) {
            return null;
        }

        return selection.getRangeAt(0);
    }

    function closestElement(node, selector) {
        var currentNode = node;

        if (!currentNode) {
            return null;
        }

        if (currentNode.nodeType === Node.TEXT_NODE) {
            currentNode = currentNode.parentElement;
        }

        while (currentNode && currentNode.nodeType === Node.ELEMENT_NODE) {
            if (currentNode.matches(selector)) {
                return currentNode;
            }
            currentNode = currentNode.parentElement;
        }

        return null;
    }

    function selectionBelongsToEditor(selection, editorRoot) {
        return Boolean(
            selection &&
            selection.rangeCount &&
            editorRoot.contains(selection.anchorNode) &&
            editorRoot.contains(selection.focusNode)
        );
    }

    function getSelectionBlock(node, editorRoot) {
        var block = closestElement(node, "p,h1,h2,h3,li,blockquote,pre,hr,div");

        if (!block || block === editorRoot || !editorRoot.contains(block)) {
            return null;
        }

        return block;
    }

    function isInsideCodeBlock(node, editorRoot) {
        var codeElement = closestElement(node, "code");
        var preElement = closestElement(node, "pre");

        if (preElement && editorRoot.contains(preElement)) {
            return true;
        }

        return Boolean(
            codeElement &&
            editorRoot.contains(codeElement) &&
            codeElement.parentElement &&
            codeElement.parentElement.tagName.toLowerCase() === "pre"
        );
    }

    function selectionTouchesCodeBlock(selection, editorRoot) {
        var range;
        var fragment;

        if (!selectionBelongsToEditor(selection, editorRoot)) {
            return false;
        }

        range = selection.getRangeAt(0);
        if (
            isInsideCodeBlock(selection.anchorNode, editorRoot) ||
            isInsideCodeBlock(selection.focusNode, editorRoot) ||
            isInsideCodeBlock(range.commonAncestorContainer, editorRoot)
        ) {
            return true;
        }

        fragment = range.cloneContents();
        return Boolean(fragment.querySelector && fragment.querySelector("pre"));
    }

    function selectionContainsLineBreak(selection) {
        var selectedText = selection ? selection.toString() : "";

        return selectedText.indexOf("\n") !== -1 || selectedText.indexOf("\r") !== -1;
    }

    function selectionCrossesBlocks(selection, editorRoot) {
        var range;
        var startBlock;
        var endBlock;

        if (!selectionBelongsToEditor(selection, editorRoot)) {
            return true;
        }

        range = selection.getRangeAt(0);
        startBlock = getSelectionBlock(range.startContainer, editorRoot);
        endBlock = getSelectionBlock(range.endContainer, editorRoot);

        return startBlock !== endBlock;
    }

    function isSupportedBlock(block) {
        var tagName = block && block.tagName ? block.tagName.toLowerCase() : "";

        return (
            tagName === "p" ||
            tagName === "h1" ||
            tagName === "h2" ||
            tagName === "h3" ||
            tagName === "li" ||
            tagName === "blockquote" ||
            tagName === "div"
        );
    }

    function isBlockActionAllowed(action, selection, editorRoot) {
        var range;
        var currentBlock;

        if (!selectionBelongsToEditor(selection, editorRoot)) {
            return false;
        }

        if (selectionTouchesCodeBlock(selection, editorRoot)) {
            return false;
        }

        range = selection.getRangeAt(0);
        currentBlock = getSelectionBlock(range.startContainer, editorRoot);

        if (!isSupportedBlock(currentBlock)) {
            return false;
        }

        return action !== "codeBlock" || currentBlock.tagName.toLowerCase() !== "pre";
    }

    function isInlineActionAllowed(action, selection, editorRoot) {
        if (
            !selectionBelongsToEditor(selection, editorRoot) ||
            !selection.rangeCount ||
            selectionTouchesCodeBlock(selection, editorRoot) ||
            selectionCrossesBlocks(selection, editorRoot)
        ) {
            return false;
        }

        if (action === "inlineCode" && selectionContainsLineBreak(selection)) {
            return false;
        }

        return true;
    }

    function warnBlockedAction() {
        if (window.console && typeof window.console.warn === "function") {
            window.console.warn("[IA Assistant] Accion Markdown ignorada por contexto no compatible.");
        }
    }

    function getCurrentBlock(container) {
        var selection = window.getSelection();
        var node = selection && selection.anchorNode ? selection.anchorNode : null;
        var blockTags = {
            blockquote: true,
            div: true,
            h1: true,
            h2: true,
            h3: true,
            li: true,
            p: true,
            pre: true
        };

        if (!node || !container.contains(node)) {
            if (!container.lastElementChild) {
                container.appendChild(document.createElement("p"));
            }
            return container.lastElementChild;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        while (node && node !== container) {
            if (node.tagName && blockTags[node.tagName.toLowerCase()]) {
                return node;
            }
            node = node.parentElement;
        }

        return container.lastElementChild || container.appendChild(document.createElement("p"));
    }

    function moveChildren(source, target) {
        while (source.firstChild) {
            target.appendChild(source.firstChild);
        }
    }

    function replaceBlockTag(block, tagName) {
        var replacement = document.createElement(tagName);

        if (block.tagName.toLowerCase() === "pre") {
            replacement.textContent = block.textContent || "";
        } else {
            moveChildren(block, replacement);
        }

        block.parentNode.replaceChild(replacement, block);
        return replacement;
    }

    function selectElementContents(element) {
        var range = document.createRange();
        var selection = window.getSelection();

        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function insertPlainTextAtSelection(container, text) {
        var range = getSelectionRange(container);
        var textNode = document.createTextNode(text);
        var selection = window.getSelection();

        if (!range) {
            container.appendChild(textNode);
            return;
        }

        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function fillElementFromBlock(target, block, fallbackText) {
        if (block.tagName.toLowerCase() === "pre") {
            target.textContent = block.textContent || fallbackText;
            return;
        }

        if (!block.textContent) {
            target.textContent = fallbackText;
            return;
        }

        moveChildren(block, target);
    }

    function inlineTagMatches(element, tagName) {
        var elementTagName = element && element.tagName ? element.tagName.toLowerCase() : "";

        if (tagName === "strong") {
            return elementTagName === "strong" || elementTagName === "b";
        }

        if (tagName === "em") {
            return elementTagName === "em" || elementTagName === "i";
        }

        return elementTagName === tagName;
    }

    function closestInlineFormat(node, tagName, editorRoot) {
        var currentNode = node;

        if (!currentNode) {
            return null;
        }

        if (currentNode.nodeType === Node.TEXT_NODE) {
            currentNode = currentNode.parentElement;
        }

        while (currentNode && currentNode !== editorRoot) {
            if (inlineTagMatches(currentNode, tagName)) {
                if (tagName === "code" && isInsideCodeBlock(currentNode, editorRoot)) {
                    return null;
                }

                return currentNode;
            }

            currentNode = currentNode.parentElement;
        }

        return null;
    }

    function getSelectionInlineFormat(selection, tagName, editorRoot) {
        var range;
        var startFormat;
        var endFormat;

        if (!selectionBelongsToEditor(selection, editorRoot) || !selection.rangeCount) {
            return null;
        }

        range = selection.getRangeAt(0);
        startFormat = closestInlineFormat(range.startContainer, tagName, editorRoot);
        endFormat = closestInlineFormat(range.endContainer, tagName, editorRoot);

        if (range.collapsed) {
            return startFormat;
        }

        return startFormat && startFormat === endFormat ? startFormat : null;
    }

    function unwrapElementPreservingChildren(element) {
        var parent = element.parentNode;
        var firstMovedNode = null;
        var lastMovedNode = null;
        var range;
        var selection;
        var child;

        if (!parent) {
            return false;
        }

        while (element.firstChild) {
            child = element.firstChild;
            if (!firstMovedNode) {
                firstMovedNode = child;
            }
            lastMovedNode = child;
            parent.insertBefore(child, element);
        }

        parent.removeChild(element);

        if (firstMovedNode && lastMovedNode) {
            range = document.createRange();
            selection = window.getSelection();
            range.setStartBefore(firstMovedNode);
            range.setEndAfter(lastMovedNode);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        return true;
    }

    function createEmptyRangeAtTextNode(textNode) {
        var range = document.createRange();
        var selection = window.getSelection();

        range.setStart(textNode, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function setCaretBeforeNode(node) {
        var range = document.createRange();
        var selection = window.getSelection();

        range.setStartBefore(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function setCaretAfterNode(node) {
        var range = document.createRange();
        var selection = window.getSelection();

        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function rangeTextBeforeCaret(range, element) {
        var beforeRange = document.createRange();

        beforeRange.selectNodeContents(element);
        beforeRange.setEnd(range.startContainer, range.startOffset);

        return beforeRange.toString();
    }

    function rangeTextAfterCaret(range, element) {
        var afterRange = document.createRange();

        afterRange.selectNodeContents(element);
        afterRange.setStart(range.startContainer, range.startOffset);

        return afterRange.toString();
    }

    function cloneContentBeforeCaret(range, element) {
        var beforeRange = document.createRange();

        beforeRange.selectNodeContents(element);
        beforeRange.setEnd(range.startContainer, range.startOffset);

        return beforeRange.cloneContents();
    }

    function cloneContentAfterCaret(range, element) {
        var afterRange = document.createRange();

        afterRange.selectNodeContents(element);
        afterRange.setStart(range.startContainer, range.startOffset);

        return afterRange.cloneContents();
    }

    function createSameInlineElement(element) {
        var tagName = element.tagName.toLowerCase();

        if (tagName === "b") {
            tagName = "strong";
        }

        if (tagName === "i") {
            tagName = "em";
        }

        return document.createElement(tagName);
    }

    function exitInlineFormatAtCaret(element, range) {
        var parent = element.parentNode;
        var beforeText = rangeTextBeforeCaret(range, element);
        var afterText = rangeTextAfterCaret(range, element);
        var beforeElement;
        var afterElement;
        var caretNode;

        if (!parent) {
            return false;
        }

        if (!beforeText) {
            setCaretBeforeNode(element);
            return true;
        }

        if (!afterText) {
            setCaretAfterNode(element);
            return true;
        }

        beforeElement = createSameInlineElement(element);
        beforeElement.appendChild(cloneContentBeforeCaret(range, element));
        afterElement = createSameInlineElement(element);
        afterElement.appendChild(cloneContentAfterCaret(range, element));
        caretNode = document.createTextNode("");

        parent.insertBefore(beforeElement, element);
        parent.insertBefore(caretNode, element);
        parent.insertBefore(afterElement, element);
        parent.removeChild(element);
        createEmptyRangeAtTextNode(caretNode);

        return true;
    }

    function wrapSelection(container, tagName, fallbackText) {
        var range = getSelectionRange(container);
        var wrapper = document.createElement(tagName);
        var selection;

        if (!range) {
            container.focus();
            range = document.createRange();
            range.selectNodeContents(getCurrentBlock(container));
            range.collapse(false);
        }

        if (range.collapsed) {
            wrapper.textContent = fallbackText;
            range.insertNode(wrapper);
            selectElementContents(wrapper);
            return;
        }

        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
        selection = window.getSelection();
        selection.removeAllRanges();
        range.selectNodeContents(wrapper);
        selection.addRange(range);
    }

    function toggleInlineFormat(container, tagName, fallbackText) {
        var selection = window.getSelection();
        var existingFormat = getSelectionInlineFormat(selection, tagName, container);

        if (existingFormat) {
            if (selection && selection.isCollapsed && selection.rangeCount) {
                return exitInlineFormatAtCaret(existingFormat, selection.getRangeAt(0));
            }

            return unwrapElementPreservingChildren(existingFormat);
        }

        wrapSelection(container, tagName, fallbackText);
        return true;
    }

    function convertBlock(container, tagName) {
        var block = getCurrentBlock(container);
        var list;
        var replacement;

        if (!block) {
            return;
        }

        if (block.tagName.toLowerCase() === "li") {
            list = block.parentNode;
            replacement = document.createElement(tagName);
            fillElementFromBlock(replacement, block, "");
            list.parentNode.replaceChild(replacement, list);
        } else {
            replacement = replaceBlockTag(block, tagName);
        }

        selectElementContents(replacement);
    }

    function convertToList(container, ordered) {
        var block = getCurrentBlock(container);
        var list = document.createElement(ordered ? "ol" : "ul");
        var item = document.createElement("li");

        if (!block) {
            return;
        }

        fillElementFromBlock(item, block, "Elemento");
        list.appendChild(item);

        if (block.tagName.toLowerCase() === "li") {
            block.parentNode.parentNode.replaceChild(list, block.parentNode);
        } else {
            block.parentNode.replaceChild(list, block);
        }

        selectElementContents(item);
    }

    function convertToCodeBlock(container) {
        var block = getCurrentBlock(container);
        var pre = document.createElement("pre");
        var code = document.createElement("code");

        if (!block) {
            return;
        }

        code.textContent = block.textContent || "codigo";
        pre.appendChild(code);
        block.parentNode.replaceChild(pre, block);
        selectElementContents(code);
    }

    function insertHorizontalRule(container) {
        var block = getCurrentBlock(container);
        var rule = document.createElement("hr");
        var paragraph = document.createElement("p");

        if (block && block.parentNode) {
            block.parentNode.insertBefore(rule, block.nextSibling);
            block.parentNode.insertBefore(paragraph, rule.nextSibling);
            selectElementContents(paragraph);
            return;
        }

        container.appendChild(rule);
        container.appendChild(paragraph);
        selectElementContents(paragraph);
    }

    function isInlineAction(action) {
        return action === "bold" || action === "italic" || action === "inlineCode";
    }

    function applyVisualAction(container, action) {
        var selection = window.getSelection();

        if (isInlineAction(action)) {
            if (!isInlineActionAllowed(action, selection, container)) {
                warnBlockedAction();
                return false;
            }
        } else if (!isBlockActionAllowed(action, selection, container)) {
            warnBlockedAction();
            return false;
        }

        container.focus();

        if (action === "normal") {
            convertBlock(container, "p");
        } else if (action === "h1") {
            convertBlock(container, "h1");
        } else if (action === "h2") {
            convertBlock(container, "h2");
        } else if (action === "h3") {
            convertBlock(container, "h3");
        } else if (action === "bold") {
            toggleInlineFormat(container, "strong", "texto");
        } else if (action === "italic") {
            toggleInlineFormat(container, "em", "texto");
        } else if (action === "inlineCode") {
            toggleInlineFormat(container, "code", "codigo");
        } else if (action === "bulletList") {
            convertToList(container, false);
        } else if (action === "numberedList") {
            convertToList(container, true);
        } else if (action === "quote") {
            convertBlock(container, "blockquote");
        } else if (action === "codeBlock") {
            convertToCodeBlock(container);
        } else if (action === "horizontalRule") {
            insertHorizontalRule(container);
        }

        return true;
    }

    function createToolbarButton(label, action, visualEditor, onAction) {
        var button = document.createElement("button");

        button.className = "ia-assistant-teoria-editor__toolbar-button";
        button.type = "button";
        button.textContent = label;
        button.addEventListener("mousedown", function (event) {
            event.preventDefault();
        });
        button.addEventListener("click", function () {
            if (visualEditor.hidden) {
                return;
            }

            if (applyVisualAction(visualEditor, action)) {
                onAction();
            }
        });

        return button;
    }

    function createToolbarGroup(label) {
        var group = document.createElement("div");
        var groupLabel = createTextElement("span", label);

        group.className = "ia-assistant-teoria-editor__toolbar-group";
        groupLabel.className = "ia-assistant-teoria-editor__toolbar-label";
        group.appendChild(groupLabel);

        return group;
    }

    function createToolbar(visualEditor, onAction, onModeChange) {
        var toolbar = document.createElement("div");
        var formatGroup = createToolbarGroup("Formato");
        var textGroup = createToolbarGroup("Texto");
        var blockGroup = createToolbarGroup("Bloques");
        var viewGroup = createToolbarGroup("Vista");
        var modeButton = document.createElement("button");

        toolbar.className = "ia-assistant-teoria-editor__toolbar";
        toolbar.setAttribute("aria-label", "Herramientas Markdown");

        [
            { label: "Normal", action: "normal" },
            { label: "H1", action: "h1" },
            { label: "H2", action: "h2" },
            { label: "H3", action: "h3" }
        ].forEach(function (actionDefinition) {
            formatGroup.appendChild(createToolbarButton(
                actionDefinition.label,
                actionDefinition.action,
                visualEditor,
                onAction
            ));
        });

        [
            { label: "B", action: "bold" },
            { label: "I", action: "italic" },
            { label: "C\u00f3digo", action: "inlineCode" }
        ].forEach(function (actionDefinition) {
            textGroup.appendChild(createToolbarButton(
                actionDefinition.label,
                actionDefinition.action,
                visualEditor,
                onAction
            ));
        });

        [
            { label: "\u2022 Lista", action: "bulletList" },
            { label: "1. Lista", action: "numberedList" },
            { label: "Cita", action: "quote" },
            { label: "Bloque c\u00f3digo", action: "codeBlock" },
            { label: "Separador", action: "horizontalRule" }
        ].forEach(function (actionDefinition) {
            blockGroup.appendChild(createToolbarButton(
                actionDefinition.label,
                actionDefinition.action,
                visualEditor,
                onAction
            ));
        });

        modeButton.className = "ia-assistant-teoria-editor__toolbar-button ia-assistant-teoria-editor__toolbar-button--mode";
        modeButton.type = "button";
        modeButton.textContent = "Markdown avanzado";
        modeButton.addEventListener("mousedown", function (event) {
            event.preventDefault();
        });
        modeButton.addEventListener("click", function () {
            onModeChange(modeButton);
        });
        viewGroup.appendChild(modeButton);

        toolbar.appendChild(formatGroup);
        toolbar.appendChild(textGroup);
        toolbar.appendChild(blockGroup);
        toolbar.appendChild(viewGroup);

        return toolbar;
    }

    function create(options) {
        var settings = options && typeof options === "object" ? options : {};
        var container = settings.container;
        var onChange = typeof settings.onChange === "function" ? settings.onChange : function () {};
        var markdownBasic = getMarkdownBasic();
        var root = document.createElement("div");
        var visualEditor = document.createElement("div");
        var textarea = document.createElement("textarea");
        var currentMarkdown = markdownBasic.normalizeMarkdown(settings.initialMarkdown || "");
        var isAdvancedMode = false;

        function emitChange(markdown) {
            currentMarkdown = markdownBasic.normalizeMarkdown(markdown);
            onChange(currentMarkdown);
        }

        function syncFromVisual() {
            emitChange(serializeVisualToMarkdown(visualEditor));
        }

        function toggleMode(modeButton) {
            isAdvancedMode = !isAdvancedMode;

            if (isAdvancedMode) {
                currentMarkdown = serializeVisualToMarkdown(visualEditor);
                textarea.value = currentMarkdown;
                visualEditor.hidden = true;
                textarea.hidden = false;
                modeButton.textContent = "Volver a visual";
                textarea.focus();
                emitChange(currentMarkdown);
                return;
            }

            currentMarkdown = markdownBasic.normalizeMarkdown(textarea.value);
            renderMarkdownToVisual(visualEditor, currentMarkdown);
            textarea.hidden = true;
            visualEditor.hidden = false;
            modeButton.textContent = "Markdown avanzado";
            visualEditor.focus();
            emitChange(currentMarkdown);
        }

        if (!container) {
            return null;
        }

        root.className = "ia-assistant-teoria-editor__markdown-editor";

        visualEditor.className = "ia-assistant-teoria-editor__visual-editor";
        visualEditor.contentEditable = "true";
        visualEditor.setAttribute("aria-label", "Contenido Markdown visual");
        visualEditor.setAttribute("role", "textbox");
        visualEditor.setAttribute("aria-multiline", "true");
        visualEditor.spellcheck = true;
        visualEditor.addEventListener("paste", function (event) {
            event.preventDefault();
            insertPlainTextAtSelection(
                visualEditor,
                event.clipboardData ? event.clipboardData.getData("text/plain") : ""
            );
            syncFromVisual();
        });
        visualEditor.addEventListener("input", syncFromVisual);

        textarea.className = "ia-assistant-teoria-editor__textarea";
        textarea.name = "ia_assistant_teoria_contenido";
        textarea.rows = 12;
        textarea.value = currentMarkdown;
        textarea.hidden = true;
        textarea.spellcheck = true;
        textarea.setAttribute("aria-label", "Markdown avanzado");
        textarea.addEventListener("input", function () {
            emitChange(textarea.value);
        });

        renderMarkdownToVisual(visualEditor, currentMarkdown);

        root.appendChild(createToolbar(visualEditor, syncFromVisual, toggleMode));
        root.appendChild(visualEditor);
        root.appendChild(textarea);
        container.appendChild(root);

        return {
            getMarkdown: function () {
                return isAdvancedMode ?
                    markdownBasic.normalizeMarkdown(textarea.value) :
                    serializeVisualToMarkdown(visualEditor);
            },
            setMarkdown: function (markdown) {
                currentMarkdown = markdownBasic.normalizeMarkdown(markdown);
                textarea.value = currentMarkdown;
                renderMarkdownToVisual(visualEditor, currentMarkdown);
                emitChange(currentMarkdown);
            }
        };
    }

    window.IAAssistant.Studio.TeoriaMarkdownEditor = {
        create: create
    };
}());

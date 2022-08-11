///////////////////////////////////////////////////////////////////////////
/// Shared Rules
const sharedRules = (isInterpreted) => {
    return {
        'div': node => {
            const type = node.getAttribute('type')
            const subtype = node.getAttribute('subtype')
            const n = node.getAttribute('n')
            if (type === 'textpart') {
                const title = document.createElement('span')
                title.className += ' section-heading';
                title.append(`${subtype} ${n}`)
                node.prepend(title)
            } else if (type === 'edition' && subtype === 'transliteration') {
                const title = document.createElement('span')
                title.className += ' section-heading';
                title.append(`Transliteration`)
                node.prepend(title)
            }
        },
        'ab': node => {
            const span = document.createElement('span')
            span.className += ' leiden-transcription';
            [...node.childNodes].forEach(child => span.appendChild(child));
            node.appendChild(span)
        },
        'milestone': node => {
            const sup = document.createElement('sup')
            sup.textContent = `${node.getAttribute('n')}`
            node.append('|')
            node.append(sup)
        },
        'cb': node => {
            const title = document.createElement('span')
            title.className += ' section-heading';
            title.append(`Col. ${node.getAttribute('n')}`)
            node.prepend(title)
        },
        'lb': node => {
            const breakAttr = node.getAttribute('break');
            const n = node.getAttribute('n')
            const style = node.getAttribute('style')
            let textIndicator = ' '
            if (style === "text-direction:r-to-l") {
                textIndicator = '←'
            } else if (style === "text-direction:l-to-r") {
                textIndicator = '→'
            } else if (style === "text-direction:spiral-clockwise") {
                textIndicator = '↻'
            } else if (style === "text-direction:circular-clockwise") {
                textIndicator = '↻'
            } else if (style === "text-direction:spiral-anticlockwise") {
                textIndicator = '↺'
            } else if (style === "text-direction:circular-anticlockwise") {
                textIndicator = '↺'
            } else if (style === "text-direction:upwards") {
                textIndicator = '↑'
            } else if (style === "text-direction:downwards") {
                textIndicator = '↓'
            }
            if (breakAttr === 'no' && isInterpreted) node.append('-');
            if (n !== 1) node.append(document.createElement('br'));
            const numSpan = document.createElement('span')
            numSpan.className += ' leiden-num-span'
            numSpan.append(`${n}. ${textIndicator}`)
            node.append(numSpan)
        },
        'space': node => {
            const extent = node.getAttribute('extent');
            const unit = node.getAttribute('unit');  // character or line
            const isUncertain = node.getAttribute('cert') === 'low'
            const quantity = node.getAttribute('quantity');
            let textContent = '('
            if (unit === 'line') {
                textContent += 'vacat'
            } else {
                if (quantity || (extent === 'unknown' && isUncertain)) {
                    textContent += 'vac.'
                    if (quantity > 1) textContent += quantity
                    if (isUncertain) textContent += '?'
                } else if (extent === 'unknown') {
                    textContent += 'vacat'
                }
            }
            textContent += ')'
            node.textContent = textContent
        },
        'gap': node => {
            let elementText;
            const reason = node.getAttribute('reason');  // 'lost' 'illegible' 'omitted'
            const extent = node.getAttribute('extent');  // always 'unknown' if present?  - never in combination with quantity or atLeast/atMost
            const quantity = node.getAttribute('quantity'); // not in combination with extent or atLeast/atMost
            const unit = node.getAttribute('unit');  // character, line, or some other unit like cm
            const atLeast = node.getAttribute('atLeast');  // not in combination with extent or quantity
            const atMost = node.getAttribute('atMost');     // not in combination with extent or quantity
            const precision = node.getAttribute('precision');  // 'low' output: ca. 
            const precisionOutput = precision && precision === 'low' ? 'ca.' : '';
            const isLine = (unit && unit === 'line');
            let closingDelimiter = ''
            if (reason === 'lost') {
                if (isLine) {
                    if (extent === 'unknown') {
                        elementText = ' - - - - - '
                    } else {
                        elementText = '  [- - - - - -';
                        closingDelimiter = ']  '
                    }
                } else {
                    // Dots are used only when exact number of characters is known.
                    // Dashes otherwise.
                    elementText = '[';
                    if (extent === 'unknown') {
                        elementText += '- - ? - -';
                    } else if (atLeast || atMost) {
                        elementText += ` - ${atLeast}-${atMost} - `
                    } else if (quantity && quantity < 5) {
                        elementText += '. '.repeat(quantity).trim();
                    } else if (quantity && quantity >= 5) {
                        if (precision === 'low' || (unit !== 'character' && unit !== 'line')) {
                            // note that we display the unit if it isn't 'character' or 'line' because it is likely 'cm'
                            elementText += `- - ${precisionOutput}${quantity}${(unit !== 'character' && unit !== 'line') ? unit : ''} - - `
                        } else {
                            elementText += `. . ${quantity} . . `
                        }
                    }
                    closingDelimiter = ']';
                }
            } else if (reason === 'illegible') {
                const beforeText = isLine ? '(Traces of ' : '. . '
                const afterText = isLine ? ' lines)' : ' . .'
                if (extent === 'unknown') {
                    elementText = isLine ?
                        `${beforeText.trim()}${afterText}` :
                        `${beforeText}?${afterText}`
                } else if (atLeast || atMost) {
                    elementText = `${beforeText}${atLeast}-${atMost}${afterText}`
                } else if (quantity && quantity < 5) {
                    elementText = '. '.repeat(quantity).trim();
                } else if (quantity && quantity >= 5) {
                    elementText = `${beforeText}${precisionOutput}${quantity}${afterText}`
                }
            } else if (reason === 'omitted') {
                elementText = '<- - ? - ';
                closingDelimiter = '->'
            }
            node.prepend(elementText);
            node.append(closingDelimiter)
        }, 'unclear': (node) => {
            //&#x30A; is equivalent to U+030A and \u030A
            const combiningChar = isLatinSpecifiedInAncestor(node) ? '\u030A' : '\u0323'
            node.textContent = node.textContent.split('').map(character => character + combiningChar).join('').trim();
        }
    }
}

const isLatinSpecifiedInAncestor = (node) => {
    if (!node) {
        return false
    } else if (node.getAttribute('xml:lang') === 'xpu-Latn') {
        return true
    } else {
        return isLatinSpecifiedInAncestor(node.parentNode);
    }
}

// End of Shared Rules
///////////////////////////////////////////////////////////////////////////////////////////

/////// Rules

const getDescendants = (node, accum) => {
    accum = accum || [];
    [...node.childNodes].forEach(child => {
        accum.push(child)
        getDescendants(child, accum);
    });
    return accum
}

const addSingleSpaceSpan = (node) => {
    const whitespaceElem = document.createElement('span')
    whitespaceElem.className += ' single-space-holder';
    node.appendChild(whitespaceElem)
}

function underline(node) {
    const underlineSpan = document.createElement('span');
    underlineSpan.className = 'underline';
    [...node.childNodes].forEach(child => underlineSpan.appendChild(child));
    node.appendChild(underlineSpan);
}

function addOpeningBracket(reason, node) {
    if (reason === 'lost') {
        node.prepend('[');
    } else if (reason === 'omitted') {
        node.prepend('<');
    } else if (reason === 'subaudible') {
        node.prepend('(scil. ');
    }
}

function addClosingBracket(reason, node) {
    if (reason === 'lost') {
        node.append(']');
    } else if (reason === 'omitted') {
        node.append('>');
    } else if (reason === 'subaudible') {
        node.append(')');
    }
}

/* 
    when we hit a supplied, prepend a square bracket, and then start looking for an adjacent supplied.
    As soon as we hit a text node with actual text, stop, and append a bracket to the last supplied we found.
    If we hit another supplied, then start looking for another.
    */
const mergeAdjacentSupplied = (node, tw) => {
    const isUncertain = node.getAttribute('cert') === 'low'
    const reason = node.getAttribute('reason')
    let lastVisitedSupplied = node;
    addOpeningBracket(reason, node);
    if (isUncertain) node.append('(?)')
    let descendants = getDescendants(node)
    let currentNode = tw.nextNode()
    while (currentNode) {
        if (descendants.includes(currentNode)) {
            // skip all descendants of 'supplied'
            // POSSIBLE TODO:  check for breaks (lb ab cb) in descendants, and if there, add an
            // opening bracket before, and a closing bracket after.
            currentNode = tw.nextNode()
        } else if (isInterveningText(currentNode) ||
            isBreak(currentNode) ||
            isNotElidableSupplied(currentNode, reason)) {
            currentNode = null    // we are done
        } else if (currentNode.nodeType === Node.ELEMENT_NODE && currentNode.nodeName === 'supplied') {
            // we've found another adjacent supplied
            lastVisitedSupplied = currentNode;
            if (currentNode.getAttribute('cert') === "low") currentNode.append('(?)')
            currentNode.setAttribute('leiden-processed', 'true')  // this is so we don't apply our rule to this 'supplied' later
            descendants = getDescendants(currentNode) // now ignore the descendants of this 'supplied' node 
            currentNode = tw.nextNode()
        } else {
            // skip over any other nodes, e.g, empty text nodes, other elements, etc.
            currentNode = tw.nextNode()
        }
    }
    // need to append the end bracket here if we've reached the end of the elements, 
    // without having hit a text node earlier
    addClosingBracket(reason, lastVisitedSupplied);
    // reset tree walker back to original node
    tw.currentNode = node
}

function isNotElidableSupplied(currentNode, firstReason) {
    return currentNode.nodeType === Node.ELEMENT_NODE
        && currentNode.nodeName === 'supplied'
        && ((currentNode.getAttribute('reason') !== firstReason) ||
            (currentNode.getAttribute('evidence') === 'previouseditor'))
}

function isBreak(currentNode) {
    return (currentNode.nodeType === Node.ELEMENT_NODE
        && ['lb', 'ab', 'cb', 'div'].includes(currentNode.nodeName));
}

function isInterveningText(currentNode) {
    return (currentNode.nodeType === Node.TEXT_NODE && currentNode.nodeValue.trim().length);
}

function processHi(node) {
    const rend = node.getAttribute('rend');
    if (rend === 'ligature') {
        // add circumflex over every character except last
        node.textContent = node.textContent.split('').join('\u0302')
    } else if (rend === "apex") {
        const oldText = node.textContent;
        node.textContent = oldText.charAt(0) + '\u0301' + oldText.substring(1)
    } else if (rend === "reversed") {
        node.prepend('((')
        node.append('))')
    } else if (rend === "intraline") {
        const strikethrough = document.createElement('span');
        strikethrough.textContent = node.textContent;
        strikethrough.className += ' strikethrough'
        node.textContent = '';
        node.appendChild(strikethrough);
        /* const strikethrough = document.createElement('s');
        strikethrough.textContent = node.textContent;
        node.textContent = '';
        node.appendChild(strikethrough); */
    } else if (rend === "supraline") {
        const supraline = document.createElement('span');
        supraline.textContent = node.textContent;
        supraline.className += ' supraline'
        node.textContent = '';
        node.appendChild(supraline);
    } else if (rend === "underline") {
        const underline = document.createElement('span');
        underline.textContent = node.textContent;
        underline.className += ' underline'
        node.textContent = '';
        node.appendChild(underline);
    } else if (rend === "superscript") {
        const sup = document.createElement('sup');
        sup.textContent = node.textContent;
        node.textContent = '';
        node.appendChild(sup);
    }

}

const hyperlinkNode = node => {
    const ref = node.getAttribute('ref');
    if (ref) {
        const a = document.createElement('a')
        const href = document.createAttribute('href')
        href.value = ref
        a.setAttributeNode(href);
        [...node.childNodes].forEach(child => a.appendChild(child));
        node.appendChild(a)
    }
}

const makePopupable = (node, popupText, openPopup) => {
    const sup = document.createElement('sup')
    // lighter arrow: \u2197   darker arrow: \u2B08
    sup.append('⦗\u2197⦘')
    const span = document.createElement('span')
    span.addEventListener("click", () => openPopup(popupText));
    // copy the nodes children to the new span
    [...node.childNodes].forEach(child => span.appendChild(child));
    span.appendChild(sup)
    node.appendChild(span)
}

const appendSpaceToNode = (node, tw) => {
    /****  IMPORTANT: textContent removes all children and sets text of this node to a concatentation of children's text */
    node.textContent = node.textContent + ' ';
}


const rules = {
    'w': node => {
        if (node.getAttribute('part') === 'I') {
            const exChild = node.querySelector('ex')
            if (exChild) {
                exChild.append('-')
            }
        }
    },
    'ex': node => {
        const cert = node.getAttribute('cert')
        node.prepend('(');
        if (cert === 'low') node.append('?')
        node.append(')')
    },
    'abbr': node => {
        if (node.parentNode.nodeName !== 'expan') node.append('(- - -)')
    },
    'am': node => {
        node.textContent = ''
    },
    'del': (node) => {
        const rend = node.getAttribute('rend');
        if (rend === "erasure") {
            node.prepend('⟦'); node.append('⟧')
        }
    },
    'handShift': (node) => {
        const newAttribute = node.getAttribute('new');
        const n = newAttribute.lastIndexOf('h');
        let handNumber = ''
        if (n) {
            let number = newAttribute.substring(n + 1);
            if (number) {
                handNumber = ' ' + number
            }
        }
        node.textContent = `((hand${handNumber}))`
    },
    'subst': (node, tw, openPopup) => {
        const del = node.querySelector('del')
        if (del) {
            const rend = del.getAttribute('rend')
            if (rend === 'corrected') {
                const popupText = `Deleted: ${del.textContent}`
                del.parentNode.removeChild(del);
                makePopupable(node, popupText, openPopup)
            }
        }
    },
    'num': (node, tw, openPopup) => {
        const value = node.getAttribute('value')
        const atLeast = node.getAttribute('atLeast')
        const atMost = node.getAttribute('atMost')
        let popupText;
        if (value) {
            popupText = value
        } else if (atLeast && atMost) {
            popupText = `${atLeast}-${atMost}`
        }
        if (popupText) {
            makePopupable(node, popupText, openPopup)
        }
    },
    'add': node => {
        const place = node.getAttribute('place');
        if (place === 'overstrike') {
            node.prepend('«')
            node.append('»')
        } else if (place === 'above') {
            node.prepend('`')
            node.append('´')
        }
    },
    'surplus': node => {
        node.prepend('{')
        node.append('}')
    },
    'desc': node => {
        node.prepend('(')
        node.append(')')
    },
    'note': node => {
        node.prepend('(')
        node.append(')')
    },
    'g': appendSpaceToNode,
    // 'name': appendSpaceToNode,
    'placename': hyperlinkNode,
    'persname': hyperlinkNode,
    'supplied': (node, tw) => {
        // ignore 'supplied' that we merged into a prior 'supplied'
        if (node.getAttribute('leiden-processed') === 'true') return null
        if (node.getAttribute('evidence') === 'previouseditor') {
            // simply underline if previouseditor, no square brackets
            underline(node)
        } else {
            mergeAdjacentSupplied(node, tw)
        }
    },
    'hi': node => {

        processHi(node);
    },
    'choice': (node, tw, openPopup) => {
        const reg = node.querySelector('reg')
        const corr = node.querySelector('corr')
        if (reg) {
            const popupText = `Regularized: ${reg.textContent}`
            reg.parentNode.removeChild(reg);
            makePopupable(node, popupText, openPopup)
        } else if (corr) {
            const popupText = `Corrected: ${corr.textContent}`
            corr.parentNode.removeChild(corr);
            makePopupable(node, popupText, openPopup)
        }
    },
    ...sharedRules(true)
}

/// End of Rules
//////////////////////////////////////////////////////////////////////////////////

//// Diplomatic Rules
function isInterveningBreak(currentNode) {
    return (currentNode.nodeType === Node.ELEMENT_NODE
        && ['lb', 'ab', 'cb', 'div'].includes(currentNode.nodeName));
}

function isInterveningText(currentNode) {
    return (currentNode.nodeType === Node.TEXT_NODE && currentNode.nodeValue.trim().length);
}

const removeAllChildNodes = (parent) => {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

const splitAround = (root, splittingElement) => {
    // divide the tree starting at root to the left and right of splittingElement
    // from https://stackoverflow.com/questions/27497718/splitting-node-content-in-javascript-dom
    for (var parent = splittingElement.parentNode; root != parent; parent = grandparent) {
        var right = parent.cloneNode(false);
        while (splittingElement.nextSibling)
            right.appendChild(splittingElement.nextSibling);
        var grandparent = parent.parentNode;
        grandparent.insertBefore(right, parent.nextSibling);
        grandparent.insertBefore(splittingElement, right);
    }
}

const findNextAdjacentSupplied = (tw) => {
    // let priorNode = tw.currentNode;
    let result = null;
    let done = false;
    while (!done && tw.nextNode()) {
        if (isInterveningText(tw.currentNode) || isInterveningBreak(tw.currentNode)) {
            done = true;    // no adjacent <supplied>, so done
        } else if (tw.currentNode.nodeType === Node.ELEMENT_NODE && ['supplied', 'gap'].includes(tw.currentNode.nodeName)) {
            result = tw.currentNode // we've found another adjacent supplied or gap
            done = true
        }
    }
    // tw.currentNode = priorNode  // reset treewalker 
    return result;   // return supplied node if any
}

const getTextFromSuppliedAndAdjacentSupplieds = (suppliedNode, tw) => {
    const containedLineBreak = suppliedNode.querySelector('lb')
    if (containedLineBreak) {
        // split the supplied in two and then continue
        splitAround(suppliedNode.parentNode, containedLineBreak)
    }
    let suppliedText = ''
    const reason = suppliedNode.getAttribute('reason');
    if (reason === 'omitted' || reason === 'subaudible') {
        suppliedNode.textContent = ''  // ignore these supplied elements
    } else {
        // remove any supplied expansions of abbreviations
        suppliedNode.querySelectorAll('ex').forEach(exNode => exNode.textContent = '')
        if (suppliedNode.nodeName === 'supplied') {
            suppliedText = suppliedNode.textContent.trim()
        } else if (suppliedNode.nodeName === 'gap') {
            let quantity = suppliedNode.getAttribute('quantity');
            if (quantity && !isNaN(quantity)) {
                suppliedText = 'X'.repeat(parseInt(quantity))
            }
        }
        removeAllChildNodes(suppliedNode)
        let adjacentSupplied = findNextAdjacentSupplied(tw);  // see if there is an adjacent supplied
        if (adjacentSupplied) {
            suppliedText = suppliedText + getTextFromSuppliedAndAdjacentSupplieds(adjacentSupplied, tw);
            adjacentSupplied.parentNode.removeChild(adjacentSupplied)
            //adjacentSupplied.textContent = ''
        }
    }
    return suppliedText
}

const diplomaticRules = {
    'supplied': (node, tw) => {

        const finalText = getTextFromSuppliedAndAdjacentSupplieds(node, tw)
        if (!finalText) {
            node.textContent = ''
        } else if (finalText.length < 5) {
            node.textContent = `[ ${'.'.repeat(finalText.length)}]`
        } else {
            node.textContent = `[.. ${finalText.length} ..]`
        }
        tw.currentNode = node;  // reset treewalker
    },
    // 'unclear': node => node.textContent = '',
    // 'gap': node => node.textContent = '',
    'desc': node => node.textContent = '',
    'note': node => node.textContent = '',
    'ex': node => node.textContent = '',
    ...sharedRules(false)
}

/////// End of Diplomatic Rules
////////////////////////////////////////////////////////////////////////////////

//////// Convert functionality
const parser = new DOMParser();

function normalizeText(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
}

function isBreak(node) {
    return (node.nodeType === Node.ELEMENT_NODE
        && ['lb', 'ab', 'cb', 'div'].includes(node.nodeName));
}

const convert = (tei, openPopup, showInterpreted, overridingRules) => {
    // openPopup takes two args:  title, body
    let fixedTEI = tei.replace(/[\r\n\t]/g, "")
    const showDiplomatic = !showInterpreted
    if (showDiplomatic) {
        fixedTEI = normalizeText(fixedTEI)
    }

    const parent = document.createElement('div')
    parser.
        parseFromString(fixedTEI, "application/xml").
        querySelectorAll('div[type="edition"]').
        forEach(node => parent.appendChild(node))

    // parser.preserveWhitespace=true;

    const tw = document.createTreeWalker(parent);

    // choose interpreted or diplomatic rules
    const rulesToApply = { ...(showInterpreted ? rules : diplomaticRules), ...overridingRules }

    while (tw.nextNode()) {

        if (tw.currentNode.nodeType === Node.TEXT_NODE &&
            showDiplomatic &&
            !['note', 'desc', 'gap'].includes(tw.currentNode.parentNode.nodeName)) {
            tw.currentNode.nodeValue = tw.currentNode.nodeValue.toUpperCase()
        }
        const rule = rulesToApply[tw.currentNode.nodeName]
        if (rule) rule(tw.currentNode, tw, openPopup)

    }

    // second pass to remove adjacent brackets that should be elided
    // start by setting treewalker back to root
    tw.currentNode = parent
    let nextBracketToMatch = null
    let nodeWithLastBracketMatched = null
    while (tw.nextNode()) {
        if (tw.currentNode.nodeType === Node.TEXT_NODE && tw.currentNode.nodeValue.trim()) {
            if (nextBracketToMatch) {
                if (tw.currentNode.nodeValue.trim().startsWith(nextBracketToMatch)) {
                    // found two adjacent brackets , e.g., ][ or )( or ><
                    // so remove both brackets
                    nodeWithLastBracketMatched.nodeValue = nodeWithLastBracketMatched.nodeValue.trim().slice(0, -1)
                    tw.currentNode.nodeValue = tw.currentNode.nodeValue.trim().slice(1)
                } else {
                    // something else was in the text node besides the bracket we were looking for so
                    // clear our matches
                    nextBracketToMatch = null
                    nodeWithLastBracketMatched = null
                }
            } else if (tw.currentNode.nodeValue.trim().endsWith(']')) {
                nextBracketToMatch = '['
                nodeWithLastBracketMatched = tw.currentNode
            } else if (tw.currentNode.nodeValue.trim().endsWith(')')) {
                nextBracketToMatch = '('
                nodeWithLastBracketMatched = tw.currentNode
            } else if (tw.currentNode.nodeValue.trim().endsWith('>')) {
                nextBracketToMatch = '<'
                nodeWithLastBracketMatched = tw.currentNode
            }
        }
    }

    return parent
}
///// End of Convert
/////////////////////////////////////////////////////////////////////////////////////////
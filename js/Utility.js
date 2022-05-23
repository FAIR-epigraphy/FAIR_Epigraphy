const N3Util = N3.Util;
//////////////////////////////////////////////
function getInscriptionId(insId) {
    if (insId !== undefined) {
        return insId.split('/').pop();
    }
    return 'N/A';
}

function getTrismegistosID(tm_id) {
    if (tm_id !== undefined) {
        return `<a href="${tm_id}" target="_blank">${tm_id.split('/').pop()}</a>`;
    }
    return 'N/A';
}

function getMaterial(matLink) {
    if (matLink !== undefined) {
        if (N3Util.isLiteral(matLink)) {
            return `<a href="javascript:void(0)">${getLiteralValue(matLink)}</a>`;
        }
        else {
            return `<a href="${matLink}" target="_blank">${matLink.split('/').pop()}</a>`;
        }
    }
    return 'N/A';
}

function isLiteral(node) {
    if (N3Util.isLiteral(node))
        return true;

    return false;
}

function getLiteralValue(literal) {
    return N3Util.getLiteralValue(literal)
}
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
        return `<a href="${tm_id}" target="_blank" class="text-decoration-none">${tm_id.split('/').pop()}</a>`;
    }
    return 'N/A';
}

function getMaterial(matLink, material) {
    if (matLink === undefined && material !== undefined) {
        return `<a href="javascript:void(0)" class="text-decoration-none">${material}</a>`;
    }
    else if (matLink !== undefined && material !== undefined) {
        return `<a href="${matLink}" target="_blank" class="text-decoration-none">${material}</a>`;
    }
    else {
        return 'N/A';
    }
}

function getObjectType(objTypeLink, objType) {
    if (objTypeLink === undefined && objType !== undefined) {
        return `<a href="javascript:void(0)" class="text-decoration-none">${objType}</a>`;
    }
    else if (objTypeLink !== undefined && objType !== undefined) {
        return `<a href="${objTypeLink}" target="_blank" class="text-decoration-none">${objType}</a>`;
    }
    else {
        return `<a href="javascript:void(0)" class="text-decoration-none">N/A</a>`;
    }
}

function isLiteral(node) {
    if (N3Util.isLiteral(node))
        return true;

    return false;
}

function getLiteralValue(literal) {
    return N3Util.getLiteralValue(literal)
}

//////////////////////////////////////////////
/// Get language by language code
function getLanguageName(code) {
    const languageNames = new Intl.DisplayNames([code], {
        type: 'language'
    });

    return `<a href="javascript:void(0)" class="text-decoration-none">${languageNames.of(code)}</a>`;
}
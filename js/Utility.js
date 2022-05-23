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
    let N3Util = N3.Util;
    if (matLink !== undefined) {
        if (N3Util.isLiteral(matLink)) {
            return `<a href="javascript:void(0)">${N3Util.getLiteralValue(matLink)}</a>`;
        }
        else {
            return `<a href="${matLink}" target="_blank">${matLink.split('/').pop()}</a>`;
        }
    }
    return 'N/A';
}
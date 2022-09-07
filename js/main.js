const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const store = new N3.Store();
var allPrefixes = {};

//////////////////////////////////////////////////////////////////////////
loadData("data/data.txt");

function loadData(file) {
    $("#data").load(file, function (responseTxt, statusTxt, xhr) {
        if (statusTxt == "success") {

            const parser_for_graphs = new N3.Parser();
            const parser = new N3.Parser();

            let uniqueGraphs = [];
            let records = [];

            var obj = { inscriptionId: '', inscriptionURI: '', material: '', materialLink: '', tmId: '', foundAt: '', geo: '', inscriptionText: '', inscriptionLabel: '', geoName: '', objectType: '', objTypeLink: '', language: '' }

            parser_for_graphs.parse(responseTxt,
                (error, quad, prefixes) => {
                    if (quad) {
                        obj = {};
                        if (quad.predicate.id.indexOf('type') !== -1 && quad.object.id.split('/').pop().indexOf('E22_Human-Made_Object') !== -1) {
                            let g = uniqueGraphs.find(x => x === quad.subject.id);
                            if (g === undefined || g === null) {
                                uniqueGraphs.push(quad.subject.id)
                            }
                        }
                    }
                    //    console.log(quad);
                    else {
                        allPrefixes = prefixes;
                        parser.parse(responseTxt,
                            (error, quad, prefixes) => {
                                if (quad) {
                                    let graph = uniqueGraphs.find(x => quad.subject.id.indexOf(x) !== -1);
                                    if (graph !== null && graph !== undefined) {
                                        store.addQuad(
                                            namedNode(quad.subject.id),
                                            namedNode(quad.predicate.id),
                                            namedNode(quad.object.id),
                                            namedNode(graph)
                                        )
                                    }
                                }
                                else {
                                    for (const g of store.getGraphs()) {
                                        obj = {};
                                        obj.inscriptionId = g.id;
                                        // Get FOAF Page
                                        obj.inscriptionURI = getObjectValue(`${allPrefixes['foaf']}page`, g);
                                        //Material
                                        obj.material = getObjectValue(`${allPrefixes['nmo']}Material`, g);
                                        obj.materialLink = getObjectValue(`${allPrefixes['nmo']}hasMaterial`, g);

                                        //PM ID
                                        obj.tmId = getObjectValue(`${allPrefixes['crm']}P48_has_preferred_identifier`, g);

                                        //Found at
                                        obj.foundAt = getObjectValue(`${allPrefixes['lawd']}foundAt`, g);
                                        //Title of the inscription
                                        obj.inscriptionLabel = getObjectValue(`${allPrefixes['rdfs']}label`, g);

                                        //lat and lng of the geo
                                        obj.geo = getObjectValue(`${allPrefixes['geo']}lat_long`, g);

                                        //Inscription text
                                        obj.inscriptionText = getObjectValue(`${allPrefixes['epnet']}hasTEI-annotatedTranscription`, g);

                                        // Geo Name
                                        obj.geoName = getObjectValue(`${allPrefixes['gn']}name`, g);

                                        // Object Type
                                        obj.objTypeLink = getObjectValue(`${allPrefixes['edh']}representsTypeOfMonument`, g);
                                        obj.objectType = getObjectValue(`${allPrefixes['nmo']}hasObjectType`, g);

                                        // Language
                                        obj.language = getObjectValue(`${allPrefixes['crmtex']}TXP1_used_writing_system`, g);

                                        /////////////////
                                        records.push(obj);
                                    }

                                    //localData.remove('rdfData');
                                    //localData.set('rdfData', store);

                                    //localStorage.removeItem('prefixes');
                                    //localStorage.setItem('prefixes', JSON.stringify(allPrefixes));

                                    const pSize = 5;
                                    $('#page-selection').pagination({
                                        dataSource: records,
                                        pageSize: pSize,
                                        showNavigator: true,
                                        formatNavigator: '<%= totalNumber %> total results',
                                        callback: function (data, pagination) {
                                            let content = '';
                                            for (let obj of data) {
                                                content += getHTMLContent(obj);
                                            }
                                            $('#content').html(content);
                                        }
                                    });
                                }
                            })
                    }
                });
        }
        if (statusTxt == "error")
            console.log("Error: " + xhr.status + ": " + xhr.statusText + ": <br />" + responseTxt);
    });
}

function getObjectValue(predicate, graph) {
    for (const quad of store.match(null, namedNode(predicate), null, namedNode(graph.id))) {
        return quad.object.value;
    }
}

function getHTMLContent(obj) {
    //let content = '';
    return `<div class="col-md-12 hoverDiv">
                <h4>
                    <a href="javascript:void(0)" class="text-decoration-none" onclick="loadDetail('${encodeURIComponent(JSON.stringify(obj))
        }')" title="${obj.inscriptionLabel}">${obj.inscriptionLabel.length <= 50 ? obj.inscriptionLabel : obj.inscriptionLabel.substring(0, 49) + '...'}</a>
                </h4>
                <dl class="row">
                            <dt class="col-sm-1 ms-5">TM ID</dt>
                            <dd class="col-sm-10">${getTrismegistosID(obj.tmId)}</dd>
                            <dt class="col-sm-1 ms-5">Material</dt>
                            <dd class="col-sm-10">
                                ${getMaterial(obj.materialLink, obj.material)}
                            </dd>
                        </dl>
                    </div> <hr />`;


    //$('#content').html(content);
}

async function loadDetail(obj) {
    obj = JSON.parse(decodeURIComponent(obj))
    //////////////////////////////////////////////////
    /// Get Visualisation
    var writer = null;
    writer = new N3.Writer({ prefixes: allPrefixes });
    for (const triple of store.match(null, null, null, namedNode(obj.inscriptionId))) {
        if (triple.subject.value.indexOf('TranscriptionText') === -1) {
            let subject = namedNode(triple.subject.value);
            let predicate = namedNode(triple.predicate.value);
            let object = N3Util.isLiteral(triple.object) === true ? literal(triple.object.value) : namedNode(triple.object.value);
            writer.addQuad(quad(
                subject, predicate, object, defaultGraph(),
            ));
        }
    }

    let closeMatches = await getRelations(obj.tmId, null);
    for (let match of closeMatches) {
        if (match.split('/').pop() !== obj.inscriptionId.split('/').pop()) {
            let subject = namedNode(obj.inscriptionId);
            let predicate = namedNode(`${allPrefixes['skos']}closeMatch`);
            let object = namedNode(match);
            writer.addQuad(quad(
                subject, predicate, object, defaultGraph(),
            ));
        }
    }

    var rdf = '';
    writer.end((error, result) => {
        rdf = result;
        //console.log(error);
    });

    //console.log(rdf);
    obj.rdfData = rdf;
    localStorage.setItem('jsonObj', JSON.stringify(obj));
    $('#page').load('detail.html', function () {
        var myModal = new bootstrap.Modal(document.getElementById('myModal'), {
            keyboard: false
        });
        myModal.show();
    });
}
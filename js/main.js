const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const store = new N3.Store();

//////////////////////////////////////////////////////////////////////////
loadData("data/data_5.txt");
function loadData(file) {
    $("#data").load(file, function (responseTxt, statusTxt, xhr) {
        if (statusTxt == "success") {

            const parser_for_graphs = new N3.Parser();
            const parser = new N3.Parser();

            let uniqueGraphs = [];

            var obj = { inscriptionId: '', inscriptionURI: '', material: '', tmId: '', foundAt: '', geo: '', inscriptionText: '', inscriptionLabel: '' }
            var arrayList = [];
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
                                    let content = '';
                                    for (const g of store.getGraphs()) {
                                        obj = {};
                                        obj.inscriptionId = g.id;
                                        // Get FOAF Page
                                        obj.inscriptionURI = getObjectValue('http://xmlns.com/foaf/0.1/page', g);
                                        //Material
                                        obj.material = getObjectValue('http://nomisma.org/ontology#hasMaterial', g);

                                        //PM ID
                                        obj.tmId = getObjectValue('http://erlangen-crm.org/current/P48_has_preferred_identifier', g);

                                        //Found at
                                        obj.foundAt = getObjectValue('http://lawd.info/ontology/foundAt', g);
                                        //Title of the inscription
                                        obj.inscriptionLabel = getObjectValue('http://www.w3.org/2000/01/rdf-schema#label', g);

                                        //lat and lng of the geo
                                        obj.geo = getObjectValue('http://www.w3.org/2003/01/geo/wgs84_pos#lat_long', g);

                                        //Inscription text
                                        obj.inscriptionText = getObjectValue('http://www.semanticweb.org/ontologies/2015/1/EPNet-ONTOP_Ontology#hasTEI-annotatedTranscription', g);

                                        /////////////////
                                        content += getHTMLContent(obj);
                                    }
                                    $('#content').html(content);
                                }
                            })

                        //console.log("# That's all, folks!", prefixes);
                        //for (const g of store.getGraphs()) {
                        //    for (const quad of store.match(null, namedNode('http://xmlns.com/foaf/0.1/page'), null, namedNode(g.id)))
                        //        console.log(quad);
                        //}
                        //dispalyHTMLContent(arrayList);
                        //for (const quad of store.match(null, null, null, namedNode('https://igcyr.unibo.it/gvcyr002')))
                        //    console.log(quad);
                        //for (const quad of store.match(null, null, null, namedNode('http://sicily.classics.ox.ac.uk/ISic000005')))
                        //    console.log(quad);
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
    return `<div class="col-md-12">
                <h4>
                    <a href="javascript:void(0)" onclick="loadDetail('${encodeURIComponent(JSON.stringify(obj))
        }')" title="${obj.inscriptionId}">${getInscriptionId(obj.inscriptionId)}</a>
                </h4>
                <dl class="row">
                            <dt class="col-sm-1 ms-5">TM ID</dt>
                            <dd class="col-sm-10">${getTrismegistosID(obj.tmId)}</dd>
                            <dt class="col-sm-1 ms-5">Material</dt>
                            <dd class="col-sm-10">
                                ${getMaterial(obj.material)}
                            </dd>
                        </dl>
                    </div> <hr />`;


    //$('#content').html(content);
}

function loadDetail(obj) {
    obj = JSON.parse(decodeURIComponent(obj))
    localStorage.setItem('jsonObj', JSON.stringify(obj));
    $('#page').load('detail.html', function () {
        var myModal = new bootstrap.Modal(document.getElementById('myModal'), {
            keyboard: false
        });
        myModal.show();
    });
}
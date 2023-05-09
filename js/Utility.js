const N3Util = N3.Util;
///////////////////////////////////////////////////////////////
/// Leiden text css
const Leidenstyles = `
    .leiden-num-span  {
      float: left;
      width: 40px;
    }
    .leiden-transcription {
      font-family: NewAthena;
    }
    .underline {
      text-decoration-line: underline;
    }
    .supraline {
        text-decoration-line: overline;
    }
    .strikethrough {
      text-decoration-line: line-through;
    }
    .section-heading {
      display:block;
      margin-top:1em
    }
    .single-space-holder::after { 
      content: '\\0020'; 
    }
`;

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
////////////////////////////////////////////
///// Get XML text
async function getEpiDocText(Id, datasource) {
    if (datasource.indexOf('sicily') !== -1) {
        var url = `http://sicily.classics.ox.ac.uk/services/inscription/${Id}.xml`;
    }
    else if (datasource.indexOf('igcyr') !== -1) {
        var url = `https://igcyr.unibo.it/igcyr/${Id}.xml`;
    }
    else if (datasource.indexOf('edh') !== -1) {
        var url = `https://edh.ub.uni-heidelberg.de/edh/inschrift/${Id}/xml`;
    }
    else if (datasource.indexOf('romaninscriptionsofbritain') !== -1) {
        return '';
    }

    var proxyUrl = 'https://intense-cliffs-42360.herokuapp.com/';
    url = proxyUrl + url;

    let myObject = await fetch(`${url}`);
    let xmlData = await myObject.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlData, "application/xml");
    const epidoc_text = xml.getElementsByTagName('text')[0].innerHTML;
    let output = convert(epidoc_text, {}, true, {}).innerHTML;
    //return '<style>' + Leidenstyles + '/<style>' + output.innerHTML;
    const regex = /null \d/ig;
    const regex_null = /null/ig;
    return output.replaceAll(regex, '').replaceAll(regex_null, '');
    //let jsonData = await myObject.json(); 
}

function downloadRDFSerialisation(rdfData, format, inscriptionId) {
    if (format === 'ttl') {
        const contentType = 'text/plain';
        const a = document.createElement('a');
        const file = new Blob([rdfData], { type: contentType });
        const filename = `${inscriptionId}.${format}`; // 'nanopub.trig';

        a.href = URL.createObjectURL(file);
        a.download = filename;
        a.click();

        URL.revokeObjectURL(a.href);
    }
    else {
        const parser = new N3.Parser();
        let quads = [];
        parser.parse(
            rdfData,
            (error, quad, prefixes) => {
                if (quad)
                    quads.push(quad);
                else {
                    var writer = null;
                    if (format === 'n3') {
                        writer = new N3.Writer({ prefixes: prefixes, format: 'text/rdf+n3' });
                    }
                    else if (format === 'nt') {
                        writer = new N3.Writer({ prefixes: prefixes, format: 'N-Triples' });
                    }
                    else if (format === 'nq') {
                        writer = new N3.Writer({ prefixes: prefixes, format: 'N-Quads' });
                    }
                    else if (format === 'trig') {
                        writer = new N3.Writer({ prefixes: prefixes, format: 'application/trig' });
                    }
                    else if (format === 'rdf') {
                        writer = new N3.Writer({ prefixes: prefixes, format: 'application/rdfstar+xml' });
                    }

                    for (let q of quads) {
                        writer.addQuad(q);
                    }

                    writer.end((error, result) => {
                        rdf = result;
                        const contentType = 'text/plain';
                        const a = document.createElement('a');
                        const file = new Blob([rdf], { type: contentType });
                        const filename = `${inscriptionId}.${format}`; // 'nanopub.trig';

                        a.href = URL.createObjectURL(file);
                        a.download = filename;
                        a.click();

                        URL.revokeObjectURL(a.href);
                    });
                }
            });
    }
}

////////////////////////////////////////////////
//// Get Coordinates from the Pleiades API
async function getLatLng(API_URL) {
    try {
        if (API_URL !== undefined) {
            if (API_URL.indexOf('https') === -1)
                API_URL = API_URL.replace('http', 'https');
            if (API_URL.indexOf('any23.org/tmp') === -1) {
                let myObject = await fetch(`${API_URL}/json`);
                let jsonData = await myObject.json();
                if (jsonData.features.length > 0) {
                    if (jsonData.features[0].geometry !== undefined) {
                        return [jsonData.features[0].geometry.coordinates[1], jsonData.features[0].geometry.coordinates[0]];
                    }
                }
                else if (jsonData.reprPoint !== undefined) {
                    return [jsonData.reprPoint[1], jsonData.reprPoint[0]];
                }
            }
        }
    }
    catch (err) {
        console.log(API_URL);
        console.log(err.message);
    }

    return null;
}
///////////////////////////////////////////////////////////////////
/// Get visualisation
async function getVisualisationFromRDF(rdfdata, from, to, controlToShow) {
    //let from = 'ttl'
    //let to = 'svg';

    let headers = new Headers();

    headers.append('Origin', 'https://inscriptiones.org');

    rdf = encodeURIComponent(rdfdata).replaceAll('%20', '+');;

    var proxyUrl = 'https://intense-cliffs-42360.herokuapp.com/',
        targetUrl = `https://www.ldf.fi/service/rdf-grapher?rdf=${rdf}&from=${from}&to=${to}`
    //targetUrl = `https://www.ldf.fi/service/rdf-grapher`

    await $.ajax({
        type: 'POST',
        contentType: 'image/png; charset=utf-8',
        data: {},
        url: targetUrl,
        cors: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Origin': 'https://inscriptiones.org'
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log(jqXHR)
        },
        success: function (data) {
            console.log(data);
            return data;
        }
    });
    var url = targetUrl;

    const response = await fetch(url, {
        mode: 'cors',
        credentials: 'include',
        method: 'POST',
        headers: headers
    });
    const imageBlob = await response.blob()
    const reader = new FileReader();
    reader.readAsDataURL(imageBlob);
    reader.onloadend = () => {
        const base64data = reader.result;
        $(controlToShow).attr('src', base64data);
    }
}

/////////////////////////////////////////////////////////////////
//// Get Relations with other data sources using TM Relation API
let projectList = {
    'EDB': ['Epigraphic Database Bari', 'https://www.edb.uniba.it/epigraph/'],
    'EDH': ['Epigraphic Database Heidelberg', 'https://edh.ub.uni-heidelberg.de/edh/inschrift/'],
    'EDCS': ['Epigraphik-Datenbank Clauss / Slaby', 'http://db.edcs.eu/epigr/edcs_id_en.php?p_edcs_id=EDCS-'],
    'EDR': ['Epigraphic Database Roma', 'http://www.edr-edr.it/edr_programmi/res_complex_comune.php?do=book&id_nr='],
    'HE': ['Hesperia', 'javascript:void(0)'],
    'UOXF': ['Last Statues of Antiquity', 'http://laststatues.classics.ox.ac.uk/database/detail-base.php?record='],
    'RIB': ['Roman Inscriptions of Britain', 'https://romaninscriptionsofbritain.org/inscriptions/'],
    'PHI': ['PHI Greek Inscriptions', 'http://epigraphy.packhum.org/text/'],
    'LUPA': ['Ubi Erat Lupa', 'http://lupa.at/'],
    'ISic': ['Inscriptions of Sicily', 'http://sicily.classics.ox.ac.uk/inscription/'],
    'IRT': ['Inscriptions of Roman Tripolitania', 'https://inslib.kcl.ac.uk/irt2009/IRT001.html'],
    'IGCyR': ['Inscriptions of Greek Cyrenaica', 'https://igcyr.unibo.it/'],
    'GVCYR': ['Inscriptions of Greek Cyrenaica', 'https://igcyr.unibo.it/'],
    'Orient': ['Arabic Papyrological Database', 'https://geniza.princeton.edu/en/documents/?q='],
    'cisp': ['Celtic Inscribed Stones', 'javascript:void(0)'],
    'DeM': ['The Deir el-Medina Database', 'javascript:void(0)'],
    'US_Epigraphy': ['U.S. EPIGRAPHY PROJECT', 'https://usepigraphy.brown.edu/projects/usep/inscription/'],
    'Wikidata': ['Wikidata', 'javascript:void(0)'],
    'CIL': ['Corpus Inscriptionum Latinarum', 'https://cil.bbaw.de/en/'],
    'hispEpOl': ['Hispania Epigraphica', 'http://eda-bea.es/pub/record_card_1.php?rec='],
};
async function getRelations(tm_id, control) {
    API_URL = `https://www.trismegistos.org/dataservices/texrelations/${tm_id.split('/').pop()}`

    let myObject = await fetch(API_URL);
    let jsonData = await myObject.json();
    let closeMatch = '';
    let closeMatches = [];
    for (let i = 1; i < jsonData.length; i++) {
        //console.log(jsonData[i]);
        for (const [key, value] of Object.entries(jsonData[i])) {
            //console.log(key, value);
            if (value !== null) {
                closeMatch += `<a href="${projectList[key][1]}${value}" target="_blank" class="text-decoration-none">${projectList[key][0]}</a> <br />`
                closeMatches.push(`${projectList[key][1]}${value}`)
            }
        }
    }
    if (control !== null)
        $(control).html(closeMatch);
    else
        return closeMatches;
}
///////////////////////////////////////////////////////////////////
/// SPARQL Queries
const SAPRQL_Queries = [{
    Queries: [{
        Full_Query: `PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                    PREFIX isicily: <http://sicily.classics.ox.ac.uk/> 
                    PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/> 
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/> 
                    PREFIX foaf: <http://xmlns.com/foaf/0.1/> 

                    SELECT DISTINCT ?page ?title ?latlng ?language 
                     WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                        epont:carriesText ?writtenText .
                           ?writtenText foaf:page ?page  ;
                            crm:P108_was_produced_by ?writing .
                            ?writing crmtex:TXP1_used_writing_system ?language .
                            OPTIONAL { ?sub rdfs:label ?title }
                            OPTIONAL { ?writtenText foaf:page ?page }
                            OPTIONAL { ?sub geo:SpatialThing ?geo .
                                     ?geo geo:lat_long ?latlng . }
                          FILTER(STR(?language) = "la") 
                    } `,
        Preview_Query: `SELECT DISTINCT ?page ?title ?latlng ?language
                          WHERE {
                              ?sub a crm:E22_Human-Made_Object ;
  	                            epont:carriesText ?writtenText .
                               ?writtenText foaf:page ?page  ;
                                crm:P108_was_produced_by ?writing .
                              ?writing crmtex:TXP1_used_writing_system ?language .
                              OPTIONAL { ?sub rdfs:label ?title }
                              OPTIONAL { ?writtenText foaf:page ?page }
                              OPTIONAL { ?sub geo:SpatialThing ?geo .
                                         ?geo geo:lat_long ?latlng . }
                             FILTER(STR(?language) = "la") `,
        query: 'Show in List'
    },
    {
        Full_Query: `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                    PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/> 
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/> 
                    PREFIX foaf: <http://xmlns.com/foaf/0.1/> 

                    SELECT (COUNT(DISTINCT ?page) as ?totalNumber)  
                     WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                        epont:carriesText ?writtenText .
                           ?writtenText foaf:page ?page  ;
                            crm:P108_was_produced_by ?writing .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          FILTER(STR(?language) = "la") 
                    } `,
        Preview_Query: `SELECT (COUNT(DISTINCT ?page) as ?totalNumber)  
                         WHERE {
                              ?sub a crm:E22_Human-Made_Object ;
  	                            epont:carriesText ?writtenText .
                               ?writtenText foaf:page ?page  ;
                                crm:P108_was_produced_by ?writing .
                               ?writing crmtex:TXP1_used_writing_system ?language .
                               FILTER(STR(?language) = "la") 
                         } `,
        query: `Total number`
    }
    ],
    Query: `Show all the Latin inscriptions`,
}, {
    Queries: [{
        Full_Query: `PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                    PREFIX isicily: <http://sicily.classics.ox.ac.uk/> 
                    PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/> 
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/> 
                    PREFIX foaf: <http://xmlns.com/foaf/0.1/> 

                    SELECT DISTINCT ?page ?title ?latlng ?language WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                    epont:carriesText ?writtenText .
                       ?writtenText foaf:page ?page  ;
                        crm:P108_was_produced_by ?writing .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      OPTIONAL { ?sub rdfs:label ?title }
                      OPTIONAL { ?writtenText foaf:page ?page }
                      OPTIONAL { ?sub geo:SpatialThing ?geo .
                                 ?geo geo:lat_long ?latlng . }
                      FILTER(STR(?language) = "grc") 
                    } `,
        Preview_Query: `SELECT DISTINCT ?page ?title ?latlng ?language WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                        epont:carriesText ?writtenText .
                           ?writtenText foaf:page ?page  ;
                            crm:P108_was_produced_by ?writing .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          OPTIONAL { ?sub rdfs:label ?title }
                          OPTIONAL { ?writtenText foaf:page ?page }
                          OPTIONAL { ?sub geo:SpatialThing ?geo .
                                     ?geo geo:lat_long ?latlng . }
                          FILTER(STR(?language) = "grc") 
                        } `,
        query: 'Show in List'
    },
    {
        Full_Query: `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                    PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/> 
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/> 
                    PREFIX foaf: <http://xmlns.com/foaf/0.1/>  

                    SELECT (COUNT(DISTINCT ?page) as ?totalNumber)  WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                    epont:carriesText ?writtenText .
                       ?writtenText foaf:page ?page  ;
                        crm:P108_was_produced_by ?writing .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      FILTER(STR(?language) = "grc") 
                    } `,
        Preview_Query: `SELECT (COUNT(DISTINCT ?page) as ?totalNumber)  WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                        epont:carriesText ?writtenText .
                           ?writtenText foaf:page ?page  ;
                            crm:P108_was_produced_by ?writing .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          FILTER(STR(?language) = "grc") 
                        } `,
        query: `Total number`
    }],
    Query: `Show all the Greek inscriptions`,
}, {
    Queries: [{
        Full_Query: `PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                    PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX nmo: <http://nomisma.org/ontology#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

                    SELECT ?page ?title ?latlng ?language ?material ?materialLink WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                       nmo:Material ?material ;
  	                    epont:carriesText ?writtenText .
                       ?writtenText foaf:page ?page  ;
                        crm:P108_was_produced_by ?writing .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      OPTIONAL { ?sub rdfs:label ?title }
                      OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                      OPTIONAL { ?writtenText foaf:page ?page }
                      OPTIONAL { ?sub geo:SpatialThing ?geo .
                                 ?geo geo:lat_long ?latlng . }
                      FILTER(lcase(STR(?material)) = "marble") 
                    } `,
        Preview_Query: `SELECT ?page ?title ?latlng ?language ?material ?materialLink WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                           nmo:Material ?material ;
  	                        epont:carriesText ?writtenText .
                           ?writtenText foaf:page ?page  ;
                            crm:P108_was_produced_by ?writing .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          OPTIONAL { ?sub rdfs:label ?title }
                          OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                          OPTIONAL { ?writtenText foaf:page ?page }
                          OPTIONAL { ?sub geo:SpatialThing ?geo .
                                 ?geo geo:lat_long ?latlng . }
                       FILTER(lcase(STR(?material)) = "marble")  `,
        query: 'Show in List'
    },
    {
        Full_Query: `PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX nmo: <http://nomisma.org/ontology#>

                    SELECT (COUNT(*) as ?TotalNumber) WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                       nmo:Material ?material .
                      FILTER(lcase(STR(?material)) = "marble") 
                    } `,
        Preview_Query: `SELECT (COUNT(*) as ?TotalNumber) WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                           nmo:Material ?material .
                          FILTER(lcase(STR(?material)) = "marble") 
                        }`,
        query: `Total number`
    }],
    Query: `Show all the the marble inscriptions`,
}, {
    Queries: [{
        Full_Query: `PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                    PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX nmo: <http://nomisma.org/ontology#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

                    SELECT ?page ?title ?latlng ?language ?material ?materialLink WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                       nmo:Material ?material ;
  	                    epont:carriesText ?writtenText .
                       ?writtenText foaf:page ?page  ;
                        crm:P108_was_produced_by ?writing .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      OPTIONAL { ?sub rdfs:label ?title }
                      OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                      OPTIONAL { ?writtenText foaf:page ?page }
                      OPTIONAL { ?sub geo:SpatialThing ?geo .
                                 ?geo geo:lat_long ?latlng . }
                      FILTER(lcase(STR(?material)) = "marble" && STR(?language) = "la") 
                    } `,
        Preview_Query: `SELECT ?page ?title ?latlng ?language ?material ?materialLink WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                           nmo:Material ?material ;
  	                        epont:carriesText ?writtenText .
                           ?writtenText foaf:page ?page  ;
                            crm:P108_was_produced_by ?writing .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          OPTIONAL { ?sub rdfs:label ?title }
                          OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                          OPTIONAL { ?writtenText foaf:page ?page }
                          OPTIONAL { ?sub geo:SpatialThing ?geo .
                                     ?geo geo:lat_long ?latlng . }
                          FILTER(lcase(STR(?material)) = "marble" && STR(?language) = "la") 
                        } `,
        query: 'Show in List'
    },
    {
        Full_Query: `PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX nmo: <http://nomisma.org/ontology#>

                    SELECT (COUNT(*) as ?TotalNumber) WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	  	                     nmo:Material ?material ;
                             epont:carriesText ?writtenText .
                       ?writtenText crm:P108_was_produced_by ?writing .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      FILTER(lcase(STR(?material)) = "marble" && STR(?language) = "la") 
                    } `,
        Preview_Query: `SELECT (COUNT(*) as ?TotalNumber) WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	  	                         nmo:Material ?material ;
                                 epont:carriesText ?writtenText .
                           ?writtenText crm:P108_was_produced_by ?writing .
                           ?writing crmtex:TXP1_used_writing_system ?language .
                          FILTER(lcase(STR(?material)) = "marble" && STR(?language) = "la") 
                        }`,
        query: `Total number`
    }],
    Query: `Show all the Latin on marble inscriptions`,
}, {
    Queries: [{
        Full_Query: `PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                    PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX nmo: <http://nomisma.org/ontology#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

                    SELECT ?page ?title ?latlng ?language ?material ?materialLink WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                       nmo:Material ?material ;
  	                    epont:carriesText ?writtenText .
                       ?writtenText foaf:page ?page  ;
                        crm:P108_was_produced_by ?writing .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      OPTIONAL { ?sub rdfs:label ?title }
                      OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                      OPTIONAL { ?writtenText foaf:page ?page }
                      OPTIONAL { ?sub geo:SpatialThing ?geo .
                                 ?geo geo:lat_long ?latlng . }
                      FILTER(lcase(STR(?material)) = "marble" && STR(?language) = "grc") 
                    } `,
        Preview_Query: `SELECT ?page ?title ?latlng ?language ?material ?materialLink WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                           nmo:Material ?material ;
  	                        epont:carriesText ?writtenText .
                           ?writtenText foaf:page ?page  ;
                            crm:P108_was_produced_by ?writing .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          OPTIONAL { ?sub rdfs:label ?title }
                          OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                          OPTIONAL { ?writtenText foaf:page ?page }
                          OPTIONAL { ?sub geo:SpatialThing ?geo .
                                     ?geo geo:lat_long ?latlng . }
                          FILTER(lcase(STR(?material)) = "marble" && STR(?language) = "grc") 
                        }`,
        query: 'Show in List'
    },
    {
        Full_Query: `PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX nmo: <http://nomisma.org/ontology#>

                    SELECT (COUNT(*) as ?TotalNumber) WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	  	                     nmo:Material ?material ;
                             epont:carriesText ?writtenText .
                       ?writtenText crm:P108_was_produced_by ?writing .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      FILTER(lcase(STR(?material)) = "marble" && STR(?language) = "grc") 
                    } `,
        Preview_Query: `SELECT (COUNT(*) as ?TotalNumber) WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	  	                         nmo:Material ?material ;
                                 epont:carriesText ?writtenText .
                           ?writtenText crm:P108_was_produced_by ?writing .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          FILTER(lcase(STR(?material)) = "marble" && STR(?language) = "grc") 
                        }`,
        query: `Total number`
    }],
    Query: `Show all the Greek on marble inscriptions`,
}, {
    Queries: [{
        Full_Query: `PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX nmo: <http://nomisma.org/ontology#>

                    SELECT DISTINCT ?objectType WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                       nmo:hasObjectType ?objectType
                    } `,
        Preview_Query: `SELECT DISTINCT ?objectType WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                           nmo:hasObjectType ?objectType
                        } `,
        query: 'Show in List'
    }
    ],
    Query: `List all the object types?`,
}, {
    Queries: [{
        Full_Query: `PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                    PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX nmo: <http://nomisma.org/ontology#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                    PREFIX crmsci: <http://www.cidoc-crm.org/crmsci/>
                    PREFIX edh: <http://edh-www.adw.uni-heidelberg.de/edh/ontology#>

                    SELECT ?page ?title ?latlng ?language ?material ?materialLink WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                       nmo:Material ?material ;
  	                    epont:carriesText ?writtenText .
                       ?writtenText foaf:page ?page  ;
                        crm:P108_was_produced_by ?writing ;
                        crmsci:O6_observed_by ?reading .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      ?reading crm:P20_had_specific_purpose ?transcription .
                      ?transcription edh:representsTypeOfInscription <http://www.eagle-network.eu/voc/typeins/lod/92.html>
                      OPTIONAL { ?sub rdfs:label ?title }
                      OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                      OPTIONAL { ?writtenText foaf:page ?page }
                      OPTIONAL { ?sub geo:SpatialThing ?geo .
                                 ?geo geo:lat_long ?latlng . }
                    } `,
        Preview_Query: `SELECT ?page ?title ?latlng ?language ?material ?materialLink WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                           nmo:Material ?material ;
  	                        epont:carriesText ?writtenText .
                           ?writtenText foaf:page ?page  ;
                            crm:P108_was_produced_by ?writing ;
                            crmsci:O6_observed_by ?reading .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          ?reading crm:P20_had_specific_purpose ?transcription .
                          ?transcription edh:representsTypeOfInscription <http://www.eagle-network.eu/voc/typeins/lod/92.html>
                          OPTIONAL { ?sub rdfs:label ?title }
                          OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                          OPTIONAL { ?writtenText foaf:page ?page }
                          OPTIONAL { ?sub geo:SpatialThing ?geo .
                                     ?geo geo:lat_long ?latlng . }
                        } `,
        query: 'Show in List'
    },
    {
        Full_Query: `PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX crmsci: <http://www.cidoc-crm.org/crmsci/>
                    PREFIX edh: <http://edh-www.adw.uni-heidelberg.de/edh/ontology#>

                    SELECT (COUNT(*) as ?TotalNumber) WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                    epont:carriesText ?writtenText .
                      ?writtenText crm:P108_was_produced_by ?writing ;
                        crmsci:O6_observed_by ?reading .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      ?reading crm:P20_had_specific_purpose ?transcription .
                      ?transcription edh:representsTypeOfInscription <http://www.eagle-network.eu/voc/typeins/lod/92.html>
                    } `,
        Preview_Query: `SELECT (COUNT(*) as ?TotalNumber) WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                        epont:carriesText ?writtenText .
                          ?writtenText crm:P108_was_produced_by ?writing ;
                            crmsci:O6_observed_by ?reading .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          ?reading crm:P20_had_specific_purpose ?transcription .
                          ?transcription edh:representsTypeOfInscription <http://www.eagle-network.eu/voc/typeins/lod/92.html>
                        }`,
        query: `Total number`
    }],
    Query: `Show all the <a href="https://www.eagle-network.eu/voc/typeins/lod/92.html" target="_blank">funerary epitaphs</a>`,
}, {
    Queries: [{
        Full_Query: `PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                    PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX nmo: <http://nomisma.org/ontology#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                    PREFIX crmsci: <http://www.cidoc-crm.org/crmsci/>
                    PREFIX edh: <http://edh-www.adw.uni-heidelberg.de/edh/ontology#>

                    SELECT ?page ?title ?latlng ?language ?material ?materialLink WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                       nmo:Material ?material ;
  	                    epont:carriesText ?writtenText .
                       ?writtenText foaf:page ?page  ;
                        crm:P108_was_produced_by ?writing ;
                        crmsci:O6_observed_by ?reading .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      ?reading crm:P20_had_specific_purpose ?transcription .
                      ?transcription crm:P14_carried_out_by <http://orcid.org/0000-0003-3819-8537>
                      OPTIONAL { ?sub rdfs:label ?title }
                      OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                      OPTIONAL { ?writtenText foaf:page ?page }
                      OPTIONAL { ?sub geo:SpatialThing ?geo .
                                 ?geo geo:lat_long ?latlng . }
                    } `,
        Preview_Query: `SELECT ?page ?title ?latlng ?language ?material ?materialLink WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                           nmo:Material ?material ;
  	                        epont:carriesText ?writtenText .
                           ?writtenText foaf:page ?page  ;
                            crm:P108_was_produced_by ?writing ;
                            crmsci:O6_observed_by ?reading .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          ?reading crm:P20_had_specific_purpose ?transcription .
                          ?transcription crm:P14_carried_out_by <http://orcid.org/0000-0003-3819-8537>
                          OPTIONAL { ?sub rdfs:label ?title }
                          OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                          OPTIONAL { ?writtenText foaf:page ?page }
                          OPTIONAL { ?sub geo:SpatialThing ?geo .
                                     ?geo geo:lat_long ?latlng . }
                        }`,
        query: 'Show in List'
    },
    {
        Full_Query: `PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX crmsci: <http://www.cidoc-crm.org/crmsci/>
                    PREFIX edh: <http://edh-www.adw.uni-heidelberg.de/edh/ontology#>

                    SELECT (COUNT(*) as ?TotalNumber) WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                    epont:carriesText ?writtenText .
                      ?writtenText crm:P108_was_produced_by ?writing ;
                        crmsci:O6_observed_by ?reading .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      ?reading crm:P20_had_specific_purpose ?transcription .
                      ?transcription crm:P14_carried_out_by <http://orcid.org/0000-0003-3819-8537>
                    } `,
        Preview_Query: `SELECT (COUNT(*) as ?TotalNumber) WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                        epont:carriesText ?writtenText .
                          ?writtenText crm:P108_was_produced_by ?writing ;
                            crmsci:O6_observed_by ?reading .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          ?reading crm:P20_had_specific_purpose ?transcription .
                          ?transcription crm:P14_carried_out_by <http://orcid.org/0000-0003-3819-8537>
                        } `,
        query: `Total number`
    }],
    Query: `Show all inscriptions to which <b>Jonathan R.W. Prag</b> contributed `,
}, {
    Queries: [{
        Full_Query: `PREFIX pav: <http://purl.org/pav/>
                    PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                    PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX nmo: <http://nomisma.org/ontology#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                    PREFIX crmsci: <http://www.cidoc-crm.org/crmsci/>
                    PREFIX edh: <http://edh-www.adw.uni-heidelberg.de/edh/ontology#>

                    SELECT ?page ?title ?latlng ?language ?material ?materialLink ?authoredBy WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                       nmo:Material ?material ;
                          pav:authoredBy ?authoredBy ;
  	                    epont:carriesText ?writtenText .
                       ?writtenText foaf:page ?page  ;
                        crm:P108_was_produced_by ?writing ;
                        crmsci:O6_observed_by ?reading .
                      ?writing crmtex:TXP1_used_writing_system ?language .
                      ?reading crm:P20_had_specific_purpose ?transcription .
                      ?transcription edh:representsTypeOfInscription <http://www.eagle-network.eu/voc/typeins/lod/92.html>
                      OPTIONAL { ?sub rdfs:label ?title }
                      OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                      OPTIONAL { ?writtenText foaf:page ?page }
                      OPTIONAL { ?sub geo:SpatialThing ?geo .
                                 ?geo geo:lat_long ?latlng . }
                     FILTER(lcase(STR(?authoredBy)) = "i.sicily") 
                    } `,
        Preview_Query: `SELECT ?page ?title ?latlng ?language ?material ?materialLink ?authoredBy 
                        WHERE {
                              ?sub a crm:E22_Human-Made_Object ;
  	                               nmo:Material ?material ;
                                  pav:authoredBy ?authoredBy ;
  	                            epont:carriesText ?writtenText .
                               ?writtenText foaf:page ?page  ;
                                crm:P108_was_produced_by ?writing ;
                                crmsci:O6_observed_by ?reading .
                              ?writing crmtex:TXP1_used_writing_system ?language .
                              ?reading crm:P20_had_specific_purpose ?transcription .
                              ?transcription edh:representsTypeOfInscription <http://www.eagle-network.eu/voc/typeins/lod/92.html>
                              OPTIONAL { ?sub rdfs:label ?title }
                              OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                              OPTIONAL { ?writtenText foaf:page ?page }
                              OPTIONAL { ?sub geo:SpatialThing ?geo .
                                         ?geo geo:lat_long ?latlng . }
                             FILTER(lcase(STR(?authoredBy)) = "i.sicily") 
                        } `,
        query: 'Show in List'
    },
    {
        Full_Query: `PREFIX pav: <http://purl.org/pav/>
                    PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                    PREFIX crm: <http://erlangen-crm.org/current/>
                    PREFIX nmo: <http://nomisma.org/ontology#>
                    PREFIX crmsci: <http://www.cidoc-crm.org/crmsci/>
                    PREFIX edh: <http://edh-www.adw.uni-heidelberg.de/edh/ontology#>

                    SELECT (COUNT(*) as ?TotalNumber) WHERE {
                      ?sub a crm:E22_Human-Made_Object ;
  	                       nmo:Material ?material ;
                           pav:authoredBy ?authoredBy ;
  	                       epont:carriesText ?writtenText .
                      ?writtenText crm:P108_was_produced_by ?writing ;
   			                       crmsci:O6_observed_by ?reading .
                      ?reading crm:P20_had_specific_purpose ?transcription .
                      ?transcription edh:representsTypeOfInscription <http://www.eagle-network.eu/voc/typeins/lod/92.html>
                     FILTER(lcase(STR(?authoredBy)) = "i.sicily") 
                    } `,
        Preview_Query: `SELECT (COUNT(*) as ?TotalNumber) WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                           nmo:Material ?material ;
                               pav:authoredBy ?authoredBy ;
  	                           epont:carriesText ?writtenText .
                          ?writtenText crm:P108_was_produced_by ?writing ;
   			                           crmsci:O6_observed_by ?reading .
                          ?reading crm:P20_had_specific_purpose ?transcription .
                          ?transcription edh:representsTypeOfInscription <http://www.eagle-network.eu/voc/typeins/lod/92.html>
                         FILTER(lcase(STR(?authoredBy)) = "i.sicily") 
                        } `,
        query: `Total number`
    }],
    Query: `How many funerary inscriptions in Sicily?`,
}, {
    Queries: [{
        Full_Query: `PREFIX pav: <http://purl.org/pav/>
                        PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                        PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                        PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                        PREFIX crm: <http://erlangen-crm.org/current/>
                        PREFIX nmo: <http://nomisma.org/ontology#>
                        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                        PREFIX crmsci: <http://www.cidoc-crm.org/crmsci/>
                        PREFIX edh: <http://edh-www.adw.uni-heidelberg.de/edh/ontology#>

                        SELECT ?page ?title ?latlng ?language ?material ?materialLink ?authoredBy WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
  	                           nmo:Material ?material ;
                              pav:authoredBy ?authoredBy ;
  	                        epont:carriesText ?writtenText .
                           ?writtenText foaf:page ?page  ;
                            crm:P108_was_produced_by ?writing ;
                            crmsci:O6_observed_by ?reading .
                          ?writing crmtex:TXP1_used_writing_system ?language .
                          ?reading crm:P20_had_specific_purpose ?transcription .
                          ?transcription edh:representsTypeOfInscription "Epitaph"
                          OPTIONAL { ?sub rdfs:label ?title }
                          OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                          OPTIONAL { ?writtenText foaf:page ?page }
                          OPTIONAL { ?sub geo:SpatialThing ?geo .
                                     ?geo geo:lat_long ?latlng . }
                          FILTER(contains(lcase(STR(?authoredBy)), "britain")) 
                        } `,
        Preview_Query: `SELECT ?page ?title ?latlng ?language ?material ?materialLink ?authoredBy 
                            WHERE {
                              ?sub a crm:E22_Human-Made_Object ;
  	                               nmo:Material ?material ;
                                  pav:authoredBy ?authoredBy ;
  	                            epont:carriesText ?writtenText .
                               ?writtenText foaf:page ?page  ;
                                crm:P108_was_produced_by ?writing ;
                                crmsci:O6_observed_by ?reading .
                              ?writing crmtex:TXP1_used_writing_system ?language .
                              ?reading crm:P20_had_specific_purpose ?transcription .
                              ?transcription edh:representsTypeOfInscription "Epitaph"
                              OPTIONAL { ?sub rdfs:label ?title }
                              OPTIONAL { ?sub nmo:hasMaterial ?materialLink }
                              OPTIONAL { ?writtenText foaf:page ?page }
                              OPTIONAL { ?sub geo:SpatialThing ?geo .
                                         ?geo geo:lat_long ?latlng . }
                              FILTER(contains(lcase(STR(?authoredBy)), "britain")) 
                            }`,
        query: 'Show in List'
    },
    {
        Full_Query: `PREFIX pav: <http://purl.org/pav/>
                        PREFIX crmtex: <http://www.cidoc-crm.org/crmtex/>
                        PREFIX epont: <http://Temporary.Epigraphic.Ontology/>
                        PREFIX crm: <http://erlangen-crm.org/current/>
                        PREFIX crmsci: <http://www.cidoc-crm.org/crmsci/>
                        PREFIX edh: <http://edh-www.adw.uni-heidelberg.de/edh/ontology#>

                        SELECT (COUNT(*) as ?TotalNumber) WHERE {
                          ?sub a crm:E22_Human-Made_Object ;
                               pav:authoredBy ?authoredBy ;
  	                           epont:carriesText ?writtenText .
                               ?writtenText crmsci:O6_observed_by ?reading .
                               ?reading crm:P20_had_specific_purpose ?transcription .
                               ?transcription edh:representsTypeOfInscription "Epitaph"
                          FILTER(contains(lcase(STR(?authoredBy)), "britain")) 
                        } `,
        Preview_Query: `SELECT (COUNT(*) as ?TotalNumber) WHERE {
                              ?sub a crm:E22_Human-Made_Object ;
                                   pav:authoredBy ?authoredBy ;
  	                               epont:carriesText ?writtenText .
                                   ?writtenText crmsci:O6_observed_by ?reading .
                                   ?reading crm:P20_had_specific_purpose ?transcription .
                                   ?transcription edh:representsTypeOfInscription "Epitaph"
                              FILTER(contains(lcase(STR(?authoredBy)), "britain")) 
                            } `,
        query: `Total number`
    }],
    Query: `How many funerary inscriptions in Britain?`,
}
]

////////////////////////////////////////////////////////////////////
/// Lang code to Language name
let ISO639_1 = { "ab": "Abkhazian", "aa": "Afar", "af": "Afrikaans", "ak": "Akan", "sq": "Albanian", "am": "Amharic", "ar": "Arabic", "an": "Aragonese", "hy": "Armenian", "as": "Assamese", "av": "Avaric", "ae": "Avestan", "ay": "Aymara", "az": "Azerbaijani", "bm": "Bambara", "ba": "Bashkir", "eu": "Basque", "be": "Belarusian", "bn": "Bengali", "bh": "Bihari languages", "bi": "Bislama", "nb": "Norwegian Bokmål", "bs": "Bosnian", "br": "Breton", "bg": "Bulgarian", "my": "Burmese", "es": "Spanish", "ca": "Valencian", "km": "Central Khmer", "ch": "Chamorro", "ce": "Chechen", "ny": "Nyanja", "zh": "Chinese", "za": "Zhuang", "cu": "Old Slavonic", "cv": "Chuvash", "kw": "Cornish", "co": "Corsican", "cr": "Cree", "hr": "Croatian", "cs": "Czech", "da": "Danish", "dv": "Maldivian", "nl": "Flemish", "dz": "Dzongkha", "en": "English", "eo": "Esperanto", "et": "Estonian", "ee": "Ewe", "fo": "Faroese", "fj": "Fijian", "fi": "Finnish", "fr": "French", "ff": "Fulah", "gd": "Scottish Gaelic", "gl": "Galician", "lg": "Ganda", "ka": "Georgian", "de": "German", "ki": "Kikuyu", "el": "Greek, Modern (1453-)", "kl": "Kalaallisut", "gn": "Guarani", "gu": "Gujarati", "ht": "Haitian Creole", "ha": "Hausa", "he": "Hebrew", "hz": "Herero", "hi": "Hindi", "ho": "Hiri Motu", "hu": "Hungarian", "is": "Icelandic", "io": "Ido", "ig": "Igbo", "id": "Indonesian", "ia": "Interlingua (International Auxiliary Language Association)", "ie": "Occidental", "iu": "Inuktitut", "ik": "Inupiaq", "ga": "Irish", "it": "Italian", "ja": "Japanese", "jv": "Javanese", "kn": "Kannada", "kr": "Kanuri", "ks": "Kashmiri", "kk": "Kazakh", "rw": "Kinyarwanda", "ky": "Kyrgyz", "kv": "Komi", "kg": "Kongo", "ko": "Korean", "kj": "Kwanyama", "ku": "Kurdish", "lo": "Lao", "la": "Latin", "lv": "Latvian", "lb": "Luxembourgish", "li": "Limburgish", "ln": "Lingala", "lt": "Lithuanian", "lu": "Luba-Katanga", "mk": "Macedonian", "mg": "Malagasy", "ms": "Malay", "ml": "Malayalam", "mt": "Maltese", "gv": "Manx", "mi": "Maori", "mr": "Marathi", "mh": "Marshallese", "ro": "Romanian", "mn": "Mongolian", "na": "Nauru", "nv": "Navajo", "nd": "North Ndebele", "nr": "South Ndebele", "ng": "Ndonga", "ne": "Nepali", "se": "Northern Sami", "no": "Norwegian", "nn": "Nynorsk, Norwegian", "ii": "Sichuan Yi", "oc": "Occitan (post 1500)", "oj": "Ojibwa", "or": "Oriya", "om": "Oromo", "os": "Ossetic", "pi": "Pali", "pa": "Punjabi", "ps": "Pushto", "fa": "Persian", "pl": "Polish", "pt": "Portuguese", "qu": "Quechua", "rm": "Romansh", "rn": "Rundi", "ru": "Russian", "sm": "Samoan", "sg": "Sango", "sa": "Sanskrit", "sc": "Sardinian", "sr": "Serbian", "sn": "Shona", "sd": "Sindhi", "si": "Sinhalese", "sk": "Slovak", "sl": "Slovenian", "so": "Somali", "st": "Sotho, Southern", "su": "Sundanese", "sw": "Swahili", "ss": "Swati", "sv": "Swedish", "tl": "Tagalog", "ty": "Tahitian", "tg": "Tajik", "ta": "Tamil", "tt": "Tatar", "te": "Telugu", "th": "Thai", "bo": "Tibetan", "ti": "Tigrinya", "to": "Tonga (Tonga Islands)", "ts": "Tsonga", "tn": "Tswana", "tr": "Turkish", "tk": "Turkmen", "tw": "Twi", "ug": "Uyghur", "uk": "Ukrainian", "ur": "Urdu", "uz": "Uzbek", "ve": "Venda", "vi": "Vietnamese", "vo": "Volapük", "wa": "Walloon", "cy": "Welsh", "fy": "Western Frisian", "wo": "Wolof", "xh": "Xhosa", "yi": "Yiddish", "yo": "Yoruba", "zu": "Zulu" };
let ISO639_2 = { "abk": "Abkhazian", "ace": "Achinese", "ach": "Acoli", "ada": "Adangme", "ady": "Adyghe", "aar": "Afar", "afh": "Afrihili", "afr": "Afrikaans", "afa": "Afro-Asiatic languages", "ain": "Ainu", "aka": "Akan", "akk": "Akkadian", "alb": "Albanian", "sqi": "Albanian", "gsw": "Swiss German", "ale": "Aleut", "alg": "Algonquian languages", "tut": "Altaic languages", "amh": "Amharic", "anp": "Angika", "apa": "Apache languages", "ara": "Arabic", "arg": "Aragonese", "arp": "Arapaho", "arw": "Arawak", "arm": "Armenian", "hye": "Armenian", "rup": "Macedo-Romanian", "art": "Artificial languages", "asm": "Assamese", "ast": "Leonese", "ath": "Athapascan languages", "aus": "Australian languages", "map": "Austronesian languages", "ava": "Avaric", "ave": "Avestan", "awa": "Awadhi", "aym": "Aymara", "aze": "Azerbaijani", "ban": "Balinese", "bat": "Baltic languages", "bal": "Baluchi", "bam": "Bambara", "bai": "Bamileke languages", "bad": "Banda languages", "bnt": "Bantu languages", "bas": "Basa", "bak": "Bashkir", "baq": "Basque", "eus": "Basque", "btk": "Batak languages", "bej": "Beja", "bel": "Belarusian", "bem": "Bemba", "ben": "Bengali", "ber": "Berber languages", "bho": "Bhojpuri", "bih": "Bihari languages", "bik": "Bikol", "byn": "Blin", "bin": "Edo", "bis": "Bislama", "zbl": "Blissymbols", "nob": "Norwegian Bokmål", "bos": "Bosnian", "bra": "Braj", "bre": "Breton", "bug": "Buginese", "bul": "Bulgarian", "bua": "Buriat", "bur": "Burmese", "mya": "Burmese", "cad": "Caddo", "spa": "Spanish", "cat": "Valencian", "cau": "Caucasian languages", "ceb": "Cebuano", "cel": "Celtic languages", "cai": "Central American Indian languages", "khm": "Central Khmer", "chg": "Chagatai", "cmc": "Chamic languages", "cha": "Chamorro", "che": "Chechen", "chr": "Cherokee", "nya": "Nyanja", "chy": "Cheyenne", "chb": "Chibcha", "chi": "Chinese", "zho": "Chinese", "chn": "Chinook jargon", "chp": "Dene Suline", "cho": "Choctaw", "zha": "Zhuang", "chu": "Old Slavonic", "chk": "Chuukese", "chv": "Chuvash", "nwc": "Old Newari", "syc": "Classical Syriac", "rar": "Rarotongan", "cop": "Coptic", "cor": "Cornish", "cos": "Corsican", "cre": "Cree", "mus": "Creek", "crp": "Creoles and pidgins", "cpe": "Creoles and pidgins, English based", "cpf": "Creoles and pidgins, French-based", "cpp": "Creoles and pidgins, Portuguese-based", "crh": "Crimean Turkish", "hrv": "Croatian", "cus": "Cushitic languages", "cze": "Czech", "ces": "Czech", "dak": "Dakota", "dan": "Danish", "dar": "Dargwa", "del": "Delaware", "div": "Maldivian", "zza": "Zazaki", "din": "Dinka", "doi": "Dogri", "dgr": "Dogrib", "dra": "Dravidian languages", "dua": "Duala", "dut": "Flemish", "nld": "Flemish", "dum": "Dutch, Middle (ca.1050-1350)", "dyu": "Dyula", "dzo": "Dzongkha", "frs": "Eastern Frisian", "efi": "Efik", "egy": "Egyptian (Ancient)", "eka": "Ekajuk", "elx": "Elamite", "eng": "English", "enm": "English, Middle (1100-1500)", "ang": "English, Old (ca.450-1100)", "myv": "Erzya", "epo": "Esperanto", "est": "Estonian", "ewe": "Ewe", "ewo": "Ewondo", "fan": "Fang", "fat": "Fanti", "fao": "Faroese", "fij": "Fijian", "fil": "Pilipino", "fin": "Finnish", "fiu": "Finno-Ugrian languages", "fon": "Fon", "fre": "French", "fra": "French", "frm": "French, Middle (ca.1400-1600)", "fro": "French, Old (842-ca.1400)", "fur": "Friulian", "ful": "Fulah", "gaa": "Ga", "gla": "Scottish Gaelic", "car": "Galibi Carib", "glg": "Galician", "lug": "Ganda", "gay": "Gayo", "gba": "Gbaya", "gez": "Geez", "geo": "Georgian", "kat": "Georgian", "ger": "German", "deu": "German", "nds": "Saxon, Low", "gmh": "German, Middle High (ca.1050-1500)", "goh": "German, Old High (ca.750-1050)", "gem": "Germanic languages", "kik": "Kikuyu", "gil": "Gilbertese", "gon": "Gondi", "gor": "Gorontalo", "got": "Gothic", "grb": "Grebo", "grc": "Greek, Ancient (to 1453)", "gre": "Greek, Modern (1453-)", "ell": "Greek, Modern (1453-)", "kal": "Kalaallisut", "grn": "Guarani", "guj": "Gujarati", "gwi": "Gwich'in", "hai": "Haida", "hat": "Haitian Creole", "hau": "Hausa", "haw": "Hawaiian", "heb": "Hebrew", "her": "Herero", "hil": "Hiligaynon", "him": "Western Pahari languages", "hin": "Hindi", "hmo": "Hiri Motu", "hit": "Hittite", "hmn": "Mong", "hun": "Hungarian", "hup": "Hupa", "iba": "Iban", "ice": "Icelandic", "isl": "Icelandic", "ido": "Ido", "ibo": "Igbo", "ijo": "Ijo languages", "ilo": "Iloko", "arc": "Official Aramaic (700-300 BCE)", "smn": "Inari Sami", "inc": "Indic languages", "ine": "Indo-European languages", "ind": "Indonesian", "inh": "Ingush", "ina": "Interlingua (International Auxiliary Language Association)", "ile": "Occidental", "iku": "Inuktitut", "ipk": "Inupiaq", "ira": "Iranian languages", "gle": "Irish", "mga": "Irish, Middle (900-1200)", "sga": "Irish, Old (to 900)", "iro": "Iroquoian languages", "ita": "Italian", "jpn": "Japanese", "jav": "Javanese", "kac": "Kachin", "jrb": "Judeo-Arabic", "jpr": "Judeo-Persian", "kbd": "Kabardian", "kab": "Kabyle", "xal": "Oirat", "kam": "Kamba", "kan": "Kannada", "kau": "Kanuri", "pam": "Pampanga", "kaa": "Kara-Kalpak", "krc": "Karachay-Balkar", "krl": "Karelian", "kar": "Karen languages", "kas": "Kashmiri", "csb": "Kashubian", "kaw": "Kawi", "kaz": "Kazakh", "kha": "Khasi", "khi": "Khoisan languages", "kho": "Sakan", "kmb": "Kimbundu", "kin": "Kinyarwanda", "kir": "Kyrgyz", "tlh": "tlhIngan-Hol", "kom": "Komi", "kon": "Kongo", "kok": "Konkani", "kor": "Korean", "kos": "Kosraean", "kpe": "Kpelle", "kro": "Kru languages", "kua": "Kwanyama", "kum": "Kumyk", "kur": "Kurdish", "kru": "Kurukh", "kut": "Kutenai", "lad": "Ladino", "lah": "Lahnda", "lam": "Lamba", "day": "Land Dayak languages", "lao": "Lao", "lat": "Latin", "lav": "Latvian", "ltz": "Luxembourgish", "lez": "Lezghian", "lim": "Limburgish", "lin": "Lingala", "lit": "Lithuanian", "jbo": "Lojban", "dsb": "Lower Sorbian", "loz": "Lozi", "lub": "Luba-Katanga", "lua": "Luba-Lulua", "lui": "Luiseno", "smj": "Lule Sami", "lun": "Lunda", "luo": "Luo (Kenya and Tanzania)", "lus": "Lushai", "mac": "Macedonian", "mkd": "Macedonian", "mad": "Madurese", "mag": "Magahi", "mai": "Maithili", "mak": "Makasar", "mlg": "Malagasy", "may": "Malay", "msa": "Malay", "mal": "Malayalam", "mlt": "Maltese", "mnc": "Manchu", "mdr": "Mandar", "man": "Mandingo", "mni": "Manipuri", "mno": "Manobo languages", "glv": "Manx", "mao": "Maori", "mri": "Maori", "arn": "Mapudungun", "mar": "Marathi", "chm": "Mari", "mah": "Marshallese", "mwr": "Marwari", "mas": "Masai", "myn": "Mayan languages", "men": "Mende", "mic": "Micmac", "min": "Minangkabau", "mwl": "Mirandese", "moh": "Mohawk", "mdf": "Moksha", "rum": "Romanian", "ron": "Romanian", "mkh": "Mon-Khmer languages", "lol": "Mongo", "mon": "Mongolian", "mos": "Mossi", "mul": "Multiple languages", "mun": "Munda languages", "nqo": "N'Ko", "nah": "Nahuatl languages", "nau": "Nauru", "nav": "Navajo", "nde": "North Ndebele", "nbl": "South Ndebele", "ndo": "Ndonga", "nap": "Neapolitan", "new": "Newari", "nep": "Nepali", "nia": "Nias", "nic": "Niger-Kordofanian languages", "ssa": "Nilo-Saharan languages", "niu": "Niuean", "zxx": "Not applicable", "nog": "Nogai", "non": "Norse, Old", "nai": "North American Indian languages", "frr": "Northern Frisian", "sme": "Northern Sami", "nso": "Sotho, Northern", "nor": "Norwegian", "nno": "Nynorsk, Norwegian", "nub": "Nubian languages", "iii": "Sichuan Yi", "nym": "Nyamwezi", "nyn": "Nyankole", "nyo": "Nyoro", "nzi": "Nzima", "oci": "Occitan (post 1500)", "pro": "Provençal, Old (to 1500)", "oji": "Ojibwa", "ori": "Oriya", "orm": "Oromo", "osa": "Osage", "oss": "Ossetic", "oto": "Otomian languages", "pal": "Pahlavi", "pau": "Palauan", "pli": "Pali", "pag": "Pangasinan", "pan": "Punjabi", "pap": "Papiamento", "paa": "Papuan languages", "pus": "Pushto", "per": "Persian", "fas": "Persian", "peo": "Persian, Old (ca.600-400 B.C.)", "phi": "Philippine languages", "phn": "Phoenician", "pon": "Pohnpeian", "pol": "Polish", "por": "Portuguese", "pra": "Prakrit languages", "que": "Quechua", "raj": "Rajasthani", "rap": "Rapanui", "qaa-qtz": "Reserved for local use", "roa": "Romance languages", "roh": "Romansh", "rom": "Romany", "run": "Rundi", "rus": "Russian", "sal": "Salishan languages", "sam": "Samaritan Aramaic", "smi": "Sami languages", "smo": "Samoan", "sad": "Sandawe", "sag": "Sango", "san": "Sanskrit", "sat": "Santali", "srd": "Sardinian", "sas": "Sasak", "sco": "Scots", "sel": "Selkup", "sem": "Semitic languages", "srp": "Serbian", "srr": "Serer", "shn": "Shan", "sna": "Shona", "scn": "Sicilian", "sid": "Sidamo", "sgn": "Sign Languages", "bla": "Siksika", "snd": "Sindhi", "sin": "Sinhalese", "sit": "Sino-Tibetan languages", "sio": "Siouan languages", "sms": "Skolt Sami", "den": "Slave (Athapascan)", "sla": "Slavic languages", "slo": "Slovak", "slk": "Slovak", "slv": "Slovenian", "sog": "Sogdian", "som": "Somali", "son": "Songhai languages", "snk": "Soninke", "wen": "Sorbian languages", "sot": "Sotho, Southern", "sai": "South American Indian languages", "alt": "Southern Altai", "sma": "Southern Sami", "srn": "Sranan Tongo", "suk": "Sukuma", "sux": "Sumerian", "sun": "Sundanese", "sus": "Susu", "swa": "Swahili", "ssw": "Swati", "swe": "Swedish", "syr": "Syriac", "tgl": "Tagalog", "tah": "Tahitian", "tai": "Tai languages", "tgk": "Tajik", "tmh": "Tamashek", "tam": "Tamil", "tat": "Tatar", "tel": "Telugu", "ter": "Tereno", "tet": "Tetum", "tha": "Thai", "tib": "Tibetan", "bod": "Tibetan", "tig": "Tigre", "tir": "Tigrinya", "tem": "Timne", "tiv": "Tiv", "tli": "Tlingit", "tpi": "Tok Pisin", "tkl": "Tokelau", "tog": "Tonga (Nyasa)", "ton": "Tonga (Tonga Islands)", "tsi": "Tsimshian", "tso": "Tsonga", "tsn": "Tswana", "tum": "Tumbuka", "tup": "Tupi languages", "tur": "Turkish", "ota": "Turkish, Ottoman (1500-1928)", "tuk": "Turkmen", "tvl": "Tuvalu", "tyv": "Tuvinian", "twi": "Twi", "udm": "Udmurt", "uga": "Ugaritic", "uig": "Uyghur", "ukr": "Ukrainian", "umb": "Umbundu", "mis": "Uncoded languages", "und": "Undetermined", "hsb": "Upper Sorbian", "urd": "Urdu", "uzb": "Uzbek", "vai": "Vai", "ven": "Venda", "vie": "Vietnamese", "vol": "Volapük", "vot": "Votic", "wak": "Wakashan languages", "wln": "Walloon", "war": "Waray", "was": "Washo", "wel": "Welsh", "cym": "Welsh", "fry": "Western Frisian", "wal": "Wolaytta", "wol": "Wolof", "xho": "Xhosa", "sah": "Yakut", "yao": "Yao", "yap": "Yapese", "yid": "Yiddish", "yor": "Yoruba", "ypk": "Yupik languages", "znd": "Zande languages", "zap": "Zapotec", "zen": "Zenaga", "zul": "Zulu", "zun": "Zuni" };
let ISO3166_1 = { "AF": "AFGHANISTAN", "AX": "ÅLAND ISLANDS", "AL": "ALBANIA", "DZ": "ALGERIA", "AS": "AMERICAN SAMOA", "AD": "ANDORRA", "AO": "ANGOLA", "AI": "ANGUILLA", "AQ": "ANTARCTICA", "AG": "ANTIGUA AND BARBUDA", "AR": "ARGENTINA", "AM": "ARMENIA", "AW": "ARUBA", "AU": "AUSTRALIA", "AT": "AUSTRIA", "AZ": "AZERBAIJAN", "BS": "BAHAMAS", "BH": "BAHRAIN", "BD": "BANGLADESH", "BB": "BARBADOS", "BY": "BELARUS", "BE": "BELGIUM", "BZ": "BELIZE", "BJ": "BENIN", "BM": "BERMUDA", "BT": "BHUTAN", "BO": "BOLIVIA, PLURINATIONAL STATE OF", "BQ": "BONAIRE, SINT EUSTATIUS AND SABA", "BA": "BOSNIA AND HERZEGOVINA", "BW": "BOTSWANA", "BV": "BOUVET ISLAND", "BR": "BRAZIL", "IO": "BRITISH INDIAN OCEAN TERRITORY", "BN": "BRUNEI DARUSSALAM", "BG": "BULGARIA", "BF": "BURKINA FASO", "BI": "BURUNDI", "KH": "CAMBODIA", "CM": "CAMEROON", "CA": "CANADA", "CV": "CAPE VERDE", "KY": "CAYMAN ISLANDS", "CF": "CENTRAL AFRICAN REPUBLIC", "TD": "CHAD", "CL": "CHILE", "CN": "CHINA", "CX": "CHRISTMAS ISLAND", "CC": "COCOS (KEELING) ISLANDS", "CO": "COLOMBIA", "KM": "COMOROS", "CG": "CONGO", "CD": "CONGO, THE DEMOCRATIC REPUBLIC OF THE", "CK": "COOK ISLANDS", "CR": "COSTA RICA", "CI": "CÔTE D'IVOIRE", "HR": "CROATIA", "CU": "CUBA", "CW": "CURAÇAO", "CY": "CYPRUS", "CZ": "CZECH REPUBLIC", "DK": "DENMARK", "DJ": "DJIBOUTI", "DM": "DOMINICA", "DO": "DOMINICAN REPUBLIC", "EC": "ECUADOR", "EG": "EGYPT", "SV": "EL SALVADOR", "GQ": "EQUATORIAL GUINEA", "ER": "ERITREA", "EE": "ESTONIA", "ET": "ETHIOPIA", "FK": "FALKLAND ISLANDS (MALVINAS)", "FO": "FAROE ISLANDS", "FJ": "FIJI", "FI": "FINLAND", "FR": "FRANCE", "GF": "FRENCH GUIANA", "PF": "FRENCH POLYNESIA", "TF": "FRENCH SOUTHERN TERRITORIES", "GA": "GABON", "GM": "GAMBIA", "GE": "GEORGIA", "DE": "GERMANY", "GH": "GHANA", "GI": "GIBRALTAR", "GR": "GREECE", "GL": "GREENLAND", "GD": "GRENADA", "GP": "GUADELOUPE", "GU": "GUAM", "GT": "GUATEMALA", "GG": "GUERNSEY", "GN": "GUINEA", "GW": "GUINEA-BISSAU", "GY": "GUYANA", "HT": "HAITI", "HM": "HEARD ISLAND AND MCDONALD ISLANDS", "VA": "HOLY SEE (VATICAN CITY STATE)", "HN": "HONDURAS", "HK": "HONG KONG", "HU": "HUNGARY", "IS": "ICELAND", "IN": "INDIA", "ID": "INDONESIA", "IR": "IRAN, ISLAMIC REPUBLIC OF", "IQ": "IRAQ", "IE": "IRELAND", "IM": "ISLE OF MAN", "IL": "ISRAEL", "IT": "ITALY", "JM": "JAMAICA", "JP": "JAPAN", "JE": "JERSEY", "JO": "JORDAN", "KZ": "KAZAKHSTAN", "KE": "KENYA", "KI": "KIRIBATI", "KP": "KOREA, DEMOCRATIC PEOPLE'S REPUBLIC OF", "KR": "KOREA, REPUBLIC OF", "KW": "KUWAIT", "KG": "KYRGYZSTAN", "LA": "LAO PEOPLE'S DEMOCRATIC REPUBLIC", "LV": "LATVIA", "LB": "LEBANON", "LS": "LESOTHO", "LR": "LIBERIA", "LY": "LIBYA", "LI": "LIECHTENSTEIN", "LT": "LITHUANIA", "LU": "LUXEMBOURG", "MO": "MACAO", "MK": "MACEDONIA, THE FORMER YUGOSLAV REPUBLIC OF", "MG": "MADAGASCAR", "MW": "MALAWI", "MY": "MALAYSIA", "MV": "MALDIVES", "ML": "MALI", "MT": "MALTA", "MH": "MARSHALL ISLANDS", "MQ": "MARTINIQUE", "MR": "MAURITANIA", "MU": "MAURITIUS", "YT": "MAYOTTE", "MX": "MEXICO", "FM": "MICRONESIA, FEDERATED STATES OF", "MD": "MOLDOVA, REPUBLIC OF", "MC": "MONACO", "MN": "MONGOLIA", "ME": "MONTENEGRO", "MS": "MONTSERRAT", "MA": "MOROCCO", "MZ": "MOZAMBIQUE", "MM": "MYANMAR", "NA": "NAMIBIA", "NR": "NAURU", "NP": "NEPAL", "NL": "NETHERLANDS", "NC": "NEW CALEDONIA", "NZ": "NEW ZEALAND", "NI": "NICARAGUA", "NE": "NIGER", "NG": "NIGERIA", "NU": "NIUE", "NF": "NORFOLK ISLAND", "MP": "NORTHERN MARIANA ISLANDS", "NO": "NORWAY", "OM": "OMAN", "PK": "PAKISTAN", "PW": "PALAU", "PS": "PALESTINIAN TERRITORY, OCCUPIED", "PA": "PANAMA", "PG": "PAPUA NEW GUINEA", "PY": "PARAGUAY", "PE": "PERU", "PH": "PHILIPPINES", "PN": "PITCAIRN", "PL": "POLAND", "PT": "PORTUGAL", "PR": "PUERTO RICO", "QA": "QATAR", "RE": "RÉUNION", "RO": "ROMANIA", "RU": "RUSSIAN FEDERATION", "RW": "RWANDA", "BL": "SAINT BARTHÉLEMY", "SH": "SAINT HELENA, ASCENSION AND TRISTAN DA CUNHA", "KN": "SAINT KITTS AND NEVIS", "LC": "SAINT LUCIA", "MF": "SAINT MARTIN (FRENCH PART)", "PM": "SAINT PIERRE AND MIQUELON", "VC": "SAINT VINCENT AND THE GRENADINES", "WS": "SAMOA", "SM": "SAN MARINO", "ST": "SAO TOME AND PRINCIPE", "SA": "SAUDI ARABIA", "SN": "SENEGAL", "RS": "SERBIA", "SC": "SEYCHELLES", "SL": "SIERRA LEONE", "SG": "SINGAPORE", "SX": "SINT MAARTEN (DUTCH PART)", "SK": "SLOVAKIA", "SI": "SLOVENIA", "SB": "SOLOMON ISLANDS", "SO": "SOMALIA", "ZA": "SOUTH AFRICA", "GS": "SOUTH GEORGIA AND THE SOUTH SANDWICH ISLANDS", "SS": "SOUTH SUDAN", "ES": "SPAIN", "LK": "SRI LANKA", "SD": "SUDAN", "SR": "SURINAME", "SJ": "SVALBARD AND JAN MAYEN", "SZ": "SWAZILAND", "SE": "SWEDEN", "CH": "SWITZERLAND", "SY": "SYRIAN ARAB REPUBLIC", "TW": "TAIWAN, PROVINCE OF CHINA", "TJ": "TAJIKISTAN", "TZ": "TANZANIA, UNITED REPUBLIC OF", "TH": "THAILAND", "TL": "TIMOR-LESTE", "TG": "TOGO", "TK": "TOKELAU", "TO": "TONGA", "TT": "TRINIDAD AND TOBAGO", "TN": "TUNISIA", "TR": "TURKEY", "TM": "TURKMENISTAN", "TC": "TURKS AND CAICOS ISLANDS", "TV": "TUVALU", "UG": "UGANDA", "UA": "UKRAINE", "AE": "UNITED ARAB EMIRATES", "GB": "UNITED KINGDOM", "US": "UNITED STATES", "UM": "UNITED STATES MINOR OUTLYING ISLANDS", "UY": "URUGUAY", "UZ": "UZBEKISTAN", "VU": "VANUATU", "VE": "VENEZUELA, BOLIVARIAN REPUBLIC OF", "VN": "VIET NAM", "VG": "VIRGIN ISLANDS, BRITISH", "VI": "VIRGIN ISLANDS, U.S.", "WF": "WALLIS AND FUTUNA", "EH": "WESTERN SAHARA", "YE": "YEMEN", "ZM": "ZAMBIA", "ZW": "ZIMBABWE" };

function getLanguageName(code) {
    if (ISO639_1[code] !== undefined) {
        return `<a href="javascript:void(0)" class="text-decoration-none">${ISO639_1[code]}</a>`;
    }
    else if (ISO639_2[code] !== undefined) {
        return `<a href="javascript:void(0)" class="text-decoration-none">${ISO639_2[code]}</a>`;

    }
    else if (ISO3166_1[code] !== undefined) {
        return `<a href="javascript:void(0)" class="text-decoration-none">${ISO3166_1[code]}</a>`;
    }
}

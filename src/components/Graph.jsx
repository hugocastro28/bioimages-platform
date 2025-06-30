const QueryGraph = () => {

    const SPARQL_QUERY = encodeURIComponent(`#defaultView:Graph
        PREFIX wdt: <http://wikibase.local/prop/direct/>
        PREFIX wd: <http://wikibase.local/entity/>

        SELECT ?item ?itemLabel ?Image ?itemImage ?logo ?value ?valueLabel ?valueImage ?edgeLabel
        WHERE {
            ?item wdt:P6 ?itemImage.
            
            ?item ?wdt ?value .
            ?edge a wikibase:Property;
                wikibase:propertyType wikibase:WikibaseItem; # note: to show all statements, removing this is not enough, the graph view only shows entities
                wikibase:directClaim ?wdt.

        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],mul,en". }
        }
        `)

    return (
        <iframe
            src = {`https://wdqs-frontend.local/embed.html#${SPARQL_QUERY}`}
            //src = {`https://wdqs-frontend.local/#${SPARQL_QUERY}&hide=[toolbar,menu]`}
            //src ="https://wdqs-frontend.local/#%23Grafo%20Imagens%0A%23defaultView%3AGraph%0APREFIX%20wdt%3A%20%3Chttp%3A%2F%2Fwikibase.local%2Fprop%2Fdirect%2F%3E%0APREFIX%20wd%3A%20%3Chttp%3A%2F%2Fwikibase.local%2Fentity%2F%3E%0A%0ASELECT%20%3Fitem%20%3FitemLabel%20%3FImage%20%3FitemImage%20%3Flogo%20%3Fvalue%20%3FvalueLabel%20%3FvalueImage%20%3FedgeLabel%0A%20%20WHERE%20%7B%0A%20%20%20%20%3Fitem%20wdt%3AP6%20%3FitemImage.%0A%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%3Fitem%20%3Fwdt%20%3Fvalue%20.%0A%20%20%20%20%20%20%3Fedge%20a%20wikibase%3AProperty%3B%0A%20%20%20%20%20%20%20%20wikibase%3ApropertyType%20wikibase%3AWikibaseItem%3B%20%23%20note%3A%20to%20show%20all%20statements%2C%20removing%20this%20is%20not%20enough%2C%20the%20graph%20view%20only%20shows%20entities%0A%20%20%20%20%20%20%20%20wikibase%3AdirectClaim%20%3Fwdt.%0A%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20bd%3AserviceParam%20wikibase%3Alanguage%20%22%5BAUTO_LANGUAGE%5D%2Cmul%2Cen%22.%20%7D%0A%7D&hide=[toolbar,menu]"
            width="100%"
            height="600px"
            style={{ border: "none" }}
        ></iframe>
    );
};

export default QueryGraph;
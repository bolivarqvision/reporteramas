/* 
node v16.17.0
npm install octokit
*/
//--"octokit": "^1.0.5", node v16.17.0
const { Octokit } = require("octokit");
const fetch = require('node-fetch');
const fs = require('fs');
const TOKEN = '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';
const URL = 'https://api.github.com/graphql';

var dateDell = new Date(2023, 09, 31);
var delTags = true;//true if dellTags

const octokit = new Octokit({

    auth: TOKEN,// acces to github whit token

});
//----------------------variables

async function main() {

    const octokit = new Octokit({

        auth: TOKEN,// acces to github whit token

    });
    const { data: user } = await octokit.request("GET /user");


    const orgAuth = 'segurosbolivar';//get organization
    const userAuth = user.login;//print acces to enable

    console.log('---------------AUT----------------------------\n');
    console.log('Autenticate', JSON.stringify(userAuth), '\n');
    console.log('---------------AUT----------------------------\n');
    //--------------------------get name repos---------------------------------------------------------------

    i = 0;
    fs.writeFileSync("./tags/Tags.csv", "Name Repo;Total Tags\n");
    fs.writeFileSync("./tags/TagsDell_2022_9.csv", "Name Repo;Name tag;date Tag;message\n");

    // elimina todos los tags de todos los repositorios
    
    for (let i = 0; i < 1000; i++) {// number of repos 986

        response = await getRepos(1, i, orgAuth, octokit);

        response.data.forEach(async (repo, j) => {

            var nameRepo = repo.name;
            var after = '';
            var netxPage = true;

            do {

                query = await getQuery(nameRepo, after);
                config = await getConf(query, TOKEN);
                response = await getResponse(URL, config)
                res = await getData(response);

                netxPage = res.repository.refs.pageInfo.hasNextPage;
                console.log(netxPage);
                after = res.repository.refs.pageInfo.endCursor;
                totalTags = res.repository.refs.totalCount;

                if (netxPage === false) {

                    console.log('repo :', nameRepo, 'total tags:', totalTags, 'paginacion: ', netxPage, 'cursor: ', after);
                    row = `${nameRepo};${totalTags}\n`;
                    fs.appendFileSync("./tags/Tags.csv", row);
                }

                if (totalTags !== 0) {

                    getINfoTag(nameRepo, res, dateDell, orgAuth, i);

                } else {

                    console.log(nameRepo, totalTags, '-------');;
                }

            } while (netxPage === true)
        })
    }

    // si quiere un repositorio en especifico descomente

/*     var nameRepo = 'ciencuadras-monorepo-mf';
    var after = '';
    var netxPage = true;

    do {

        query = await getQuery(nameRepo, after);
        config = await getConf(query, TOKEN);
        response = await getResponse(URL, config)
        res = await getData(response);

        netxPage = res.repository.refs.pageInfo.hasNextPage;
        console.log(netxPage);
        after = res.repository.refs.pageInfo.endCursor;
        totalTags = res.repository.refs.totalCount;

        if (netxPage === false) {

            console.log('repo :', nameRepo, 'total tags:', totalTags, 'paginacion: ', netxPage, 'cursor: ', after);
            row = `${nameRepo};${totalTags}\n`;
            fs.appendFileSync("./tags/Tags.csv", row);
        }

        if (totalTags !== 0) {

            getINfoTag(nameRepo, res, dateDell, orgAuth, i);

        } else {

            console.log(nameRepo, totalTags, '-------');;
        }

    } while (netxPage === true) */

}
main();

function getINfoTag(nameRepo, data, dateDell, orgAuth) {
    tags = data.repository.refs.nodes;
    tags.forEach(tag => {

        nameTag = tag.name;
        dateTag = new Date(tag.target.committedDate);
        dat = tag.target.committedDate;
        message = new String(tag.target.message).replace(/\s+/g, '_').replace(/,/g, '.').replace(/"/g, '.');
        let date = new Date(dateTag.getFullYear(), dateTag.getMonth(), dateTag.getDate());

        if (date <= dateDell) {

            console.log('yes: ', dat);

            row = `${nameRepo};${nameTag};${dateTag.toLocaleDateString()};${message}\n`
            fs.appendFileSync("./tags/TagsDell_2022_7.csv", row);
            //primero genere el archivo .csv revise fechas por si acaso y luego descomente la siguiente linea
            //DelteTags(nameTag, 'ciencuadras-monorepo-mf', orgAuth, octokit);


        } else { console.log('no: ', dat); }


    })
}

function FilterTag(nameTag, dateTag, dateDell) {
    let date = new Date(dateTag.getFullYear(), dateTag.getMonth(), dateTag.getDate());
    if (date < dateDell) {
        console.log('si es');
    } else { console.log('no'); }

}

async function DelteTags(tagName = String, nameRepo = String, auth = String, octokit) {
    try {
        const response = await octokit.request('DELETE /repos/{owner}/{repo}/git/refs/tags/{ref}', {//query repos
            owner: auth,
            repo: nameRepo,
            ref: tagName,
        })
        console.log(JSON.stringify(response.status), tagName);
        return response;
    } catch (e) { console.log(e.response); }
}

//--------------get name repos
async function getRepos(per_page = Number, page = Number, auth = String, octokit) {
    try {
        const response = await octokit.request('GET /orgs/{org}/repos', {//query repos
            org: auth,
            type: 'all',
            sort: 'name',
            per_page: per_page,
            page: page,
        })
        return response;
    } catch (e) { console.log(e.response.status); }
}

async function getQuery(nameRepo, endCursor) {

    return JSON.stringify({//without variables
        query: `
      query ($endCursor: String) {
        repository(owner: "segurosbolivar", name: "${nameRepo}") {
          refs(refPrefix: "refs/tags/", first: 100, after: $endCursor) {
            totalCount
            pageInfo {
              endCursor
              hasNextPage
            }
            nodes {
              name
              target {
                ... on Commit {
                  abbreviatedOid
                  committedDate
                  message
                  author{
                    name
                  }
                }
                ... on Tag {
                  target {
                    ... on Commit {
                      abbreviatedOid
                      committedDate
                      message
                      author{
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }        
            `,
        variables: {
            endCursor,
        }
    });

}

async function getConf(query, TOKEN) {
    return {
        method: 'post',
        body: query,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            "Authorization": 'Bearer ' + TOKEN,
        }
    };
}

async function getResponse(URL, conf) {
    try {

        res = await fetch(
            URL,
            conf,
        );
        return res;
    } catch (e) {
        console.log(e.response.status);
        return e;
    }
}

async function getData(response) {

    res = await response.json();
    res = res.data;
    return res;

}

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}


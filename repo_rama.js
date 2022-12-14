const fetch = require('node-fetch');
const fs = require('fs');
const URL = 'https://api.github.com/graphql';
const TOKEN = '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';

const toDay = new Date(Date.now()).toDateString();

async function main() {
  // encabezado del archivo csv

  fs.writeFileSync(`./repo${toDay}.csv`, "nameRepo;defaultBranch;committedDateDefaultBranch;nameBranch;committedDate\n");

  // variables para la paginacion con grapql
  var afterR = null;// endCursor pagination repositories
  var netxPage = true;//indica si existe paginacion(se traen 1 resultado por consulta)

  do {
    // query de consulta para traer nombre de repositorio
    query = await getQueryR(afterR)
    var config = await getConf(query, TOKEN);
    response = await getResponse(URL, config);
    res = await getData(response);

    // informacion de la paginacion en el response
    pageInfo = res.organization.repositories.pageInfo;
    nextPage = pageInfo.hasNextPage;// valor true(si existe pagina siguiente) or false(si no existe pagina siguiente),
    afterR = pageInfo.endCursor;// cursor en que termina la consulta

    //name repository
    repoName = res.organization.repositories.edges[0].node.name;
    console.log(JSON.stringify(repoName, null, 2), '----');

    // query de consulta para traer informacion de las ramas del repositorio

    var afterB = null;// cursor de la paginacion de la consulta de las ramas

    var query = await getQueryB(repoName, afterB);
    var config = await getConf(query, TOKEN);
    res = await getResponse(URL, config);
    data = await getData(res);
    // funcion para separar repositorios con paginacion y sin paginacion(se trae 100 resultados por consulta,es el valor max que permite la api)
    await filter(data);


  } while (netxPage === true)


}

main();

async function getQueryR(afterR) {
  return JSON.stringify({//without variables
    query: `
          query ($afterR: String) {
            organization(login: "segurosbolivar") {
              repositories(
                orderBy: { field: NAME, direction: ASC }
                first: 1
                after: $afterR
              ) {
                edges {
                  node {
                    name
                  }
                  cursor
                }
                totalCount
                pageInfo {
                  startCursor
                  hasPreviousPage
                  hasNextPage
                  endCursor
                }
              }
            }
          }
          `,
    variables: {
      afterR,
    }
  });

}

async function getQueryB(repoName, after) {
  return JSON.stringify({//without variables
    query: `
      query MyQuery($after: String) {
          repository(name: "${repoName}", owner: "segurosbolivar") {
            name
            defaultBranchRef {
              name
              target {
                  ... on Commit {
                    committedDate
                  }
                }
            }
            refs(
              first: 100
              refPrefix: "refs/heads/"
              direction: DESC
              after: $after
              orderBy: { field: ALPHABETICAL, direction: ASC }
            ) {
              totalCount
              edges {
                node {
                  name
                  target {
                    ... on Commit {
                      committedDate
                    }
                  }
                }
                cursor
              }
              pageInfo {
                hasPreviousPage
                hasNextPage
                startCursor
                endCursor
              }
            }
          }
        }        
          `,
    variables: {
      after,
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

async function filter(data) {

  totalBranches = data.repository.refs.totalCount;

  console.log(totalBranches);

  if (totalBranches > 0 && totalBranches < 100) {

    branchData(data);

  } else if (totalBranches > 100) {

    await branchPluss100(data);

  } else { console.log('to tiene ramas'); }

}
// funcion para aquellos repos que tienen mas de 100 ramas(para paginarlos)
async function branchPluss100(data) {

  nameRepo = data.repository.name;
  var nextPageB = true;
  var nextCursor = null; // cursor branch
  var i = 0;
  do {
    // get name branches
    var query = await getQueryB(repoName, nextCursor)
    var config = await getConf(query, TOKEN);
    res = await getResponse(URL, config);
    data = await getData(res);
    branchData(data);
    // info pagination branches
    pageInfoB = data.repository.refs.pageInfo;
    nextPageB = pageInfoB.hasNextPage;
    nextCursor = pageInfoB.endCursor;

    console.log(JSON.stringify(nextPageB, null, 2), '----', i);
    i = i + 1;
  } while (nextPageB === true)

}
// funcion que genera el archivo csv con la informacion de la rama
function branchData(data) {

  nameRepo = data.repository.name;
  defaultBranch = data.repository.defaultBranchRef.name;// devido a que todos los repos no tienen rama master, la consulta me indoca cual es la rama principal por defecto
  committedDateDefaultBranch = data.repository.defaultBranchRef.target.committedDate;

  branche = data.repository.refs.edges;

  branche.forEach(ele => {
    if (ele.name !== defaultBranch) {

      nameBranch = ele.node.name;
      committedDate = ele.node.target.committedDate;
      row = `${nameRepo};${defaultBranch};${committedDateDefaultBranch};${nameBranch};${committedDate}\n`
      fs.appendFileSync(`./repo${toDay}.csv`, row);

    }

  })
}



/* 
node  v16.17.0
npm install axios

*/

const axios = require('axios');
const fs = require('fs');

const URLJobs = 'https://jenkins.segurosbolivar.com:8443/api/json?pretty=true';
const USER = 'diego.castro@segurosbolivar.com';
const TOKEN = '11f22eecffc34821758e3690e3c35bf36a';
const toDay = new Date(Date.now()).toDateString();

async function main() {

    fs.writeFileSync(`./proj_Repo${toDay}.csv`, "nameProject;nameRepo\n");
    fs.writeFileSync(`./proj${toDay}.csv`, "nameProject\n");

    conf = await getConf(URLJobs, USER, TOKEN)
    try {

        response = await axios(conf);

        data = response.data.jobs;

        data.forEach(async ele => {

            var nameJob = ele.name;
            row = `${nameJob}\n`
            fs.appendFileSync(`./proj${toDay}.csv`, row);
            const URLJob = `https://jenkins.segurosbolivar.com:8443/job/${nameJob}/api/json?pretty=true`;
            //console.log(nameJob);
            conf = await getConf(URLJob, USER, TOKEN)

            try {

                res = await axios(conf);
                jobs = res.data.jobs;

                jobs.forEach(ele => {
                    repoName = ele.name;
                    row = `${nameJob};${repoName}\n`
                    fs.appendFileSync(`./proj_Repo${toDay}.csv`, row);
                    console.log(nameJob, repoName, '---');
                })

            } catch (error) {
                console.log(error, nameJob);
            }
        })
    } catch (error) {

        console.log(error, nameJob);
    }





}

main();

async function getConf(URL, USER, TOKEN) {
    return {
        method: 'get',
        url: URL,
        auth: {
            username: USER,
            password: TOKEN,
        },
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

    console.log('total de ramas', totalBranches);

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



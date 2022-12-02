(async()=>{
    "use strict";

    // Dependencies
    const gitDownloader = require("git-downloader")
    const { runJobs } = require("parallel-park")
    const request = require("request-async")
    const path = require("path")
    const fs = require("fs")
    
    // Variables
    const args = process.argv.slice(2)
    const repos = []
    
    // Functions
    function orgRepos(name){
        return new Promise(async(resolve)=>{
            var page = 0
            
            async function scrape(){
                var response = await request(`https://api.github.com/orgs/${name}/repos?page_max=50&page=${page}`, {
                    headers: {
                        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36"
                    }
                })
                response = JSON.parse(response.body)

                if(!response.length) return resolve()

                for( const repo of response ) repos.push(repo.html_url)

                page++
                scrape()
            }

            scrape()
        })
    }
    
    
    // Main
    if(!args.length) return console.log("usage: node index.js <orgName> <outputDir>")

    console.log("Scraping organization repos, please wait...")
    await orgRepos(args[0])

    console.log(`${repos.length} repositories found.`)
    console.log("Downloading organization repos, please wait...")
    await runJobs(
        repos,
        async(repo)=>{
            const name = repo.match(/.com\/.*?\/.*/)[0].replace(/.com\/.*?\/|.git/, "")
            const file = path.join(__dirname, args[1], name)

            if(!fs.existsSync(file)) fs.mkdirSync(file)

            console.log(`Downloading ${repo}`)
            
            try{
                await gitDownloader({ source: repo, destination: `${args[1]}/${name}` })

                console.log(`Successfully downloaded ${repo}`)
            }catch{}
        },
        {
            concurrency: 50
        }
    )

    console.log("Finished.")
})()
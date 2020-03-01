const util = require("util");
const fs = require("fs");
const exec = util.promisify( require("child_process").exec ); //取得可以用 terminal 的指令
const readFile = util.promisify(fs.readFile);


//IIFE immediately invoked function
(
    async function(){
        let strJson = await readFile('downloads/youtube.json', { encoding : 'utf-8' });
        let arrJson = JSON.parse(strJson);
        //console.dir(arrJson, {depth: null});

        for(let i = 0 ; i < arrJson.length ; i++){
            await exec(`youtube-dl -f mp4 -i ${arrJson[i].link} -o "downloads/%(id)s.%(ext)s"`);
            
            if(i === 2){
                break;
            }
        }
    }
)();
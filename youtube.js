const Nightmare = require("nightmare");
const nightmare = Nightmare({ show: true, width: 1280, height: 1024});
const util = require("util");
const fs = require("fs");

//引入jquery 機制
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const $ = require("jquery")(window);

//使工具擁有 promise 的特性
const writeFile = util.promisify(fs.writeFile);

//瀏覽器標頭，讓對方以為我們是人類
const headers = {
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/sign ed-exchange;v=b3',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7', 
};

//放置網頁元素（物件型態）
let arrLink = [];

//要輸入的歌手名稱
let strSinger = "omoinotake";


//初始化設定
async function step1(){
    //如果不存在downloads的資料夾，則加入
    try{
        if (!fs.existsSync('downloads')){
            fs.mkdirSync('downloads');
        }
    }catch(err){
        throw err;
        // console.log(err);
    }
}

//搜尋關鍵字
async function step2(){
    console.log("準備搜尋...");

    await nightmare
    .goto("https://www.youtube.com", headers) //去youtube
    .type('input#search', strSinger)
    .click("button#search-icon-legacy")
    .catch((err)=>{
        console.error(err);
    })
}

//滾動頁面，將動態資料逐一顯示出來
async function step3(){
    console.log("準備滾動頁面");
    
    let currentHeight = 0; //window 裡面內容的當前總高度
    let offset = 0; //總偏移量

    //不斷地滾動，直到沒法再往下滾
    while(offset <= currentHeight){
        //因為youtube會動態生成元素，所以要一直去抓瀏覽器當前的高度
        currentHeight = await nightmare.evaluate(()=>{
            return document.documentElement.scrollHeight; //回傳瀏覽器當前已滾動的高度
        });

        //每次滾動 500 單位的距離，offset累加，才能對調合適的距離
        offset += 500;
        await nightmare.scrollTo(offset, 0).wait(500);

        //滾動一段高度後，強制跳出迴圈 => 視情況使用
        if(offset > 2000){
            break;
        }
    }
}

//分析、整理、收集 重要資訊
async function step4(){
    console.log("分析、整理、收集重要資訊");

    let html = await nightmare.evaluate(()=>{
        return document.documentElement.innerHTML;
    });

    let pattern = null;
    let arrMatch = null;
    let obj = {};

    $(html).find("div#contents.style-scope.ytd-item-section-renderer ytd-video-renderer.style-scope.ytd-item-section-renderer")
    .each((index, element)=>{
        //找出個別的縮圖連結 & 影片ID
        let imgLink = $(element).find("img#img.style-scope.yt-img-shadow").attr("src");
        pattern = /https:\/\/i\.ytimg\.com\/vi\/([a-zA-Z0-9_]{11})\/hqdefault\.jpg/g;

        if( (arrMatch = pattern.exec(imgLink)) !== null ){
            //pattern.exec 會回傳 array，沒有配對到則是null
            obj.img = arrMatch[0]; //縮圖連結
            obj.id = arrMatch[1]; //從連結擷取出來的 video id (watch?v=xxxxxxxxxxx)

            //影片名稱
            let vidTitle = $(element).find("a#video-title.yt-simple-endpoint.style-scope.ytd-video-renderer").text();
            vidTitle = vidTitle.trim(); //去除左右側的空白
            obj.title = vidTitle;

            //影片節
            let vidLink = $(element).find("ytd-thumbnail a#thumbnail.ytd-thumbnail").attr("href");
            vidLink = "https://www.youtube.com" + vidLink;
            obj.link = vidLink;

            //歌手名稱
            obj.singer = strSinger;

            //將資訊放入全域陣列變數中
            arrLink.push(obj);

            //obj 初始化（清空）
            obj = {};
        }
    })
}

//關閉 nightmare
async function step5(){
    await nightmare.end(err=>{
        if(err) throw err;
        console.log("Nightmare is closed.");
    });
}


//讓程式一個個執行
async function asyncArray(functionList){
    for(let func of functionList){
        await func();
    }
}

//執行
try{
    asyncArray([step1, step2, step3, step4, step5]).then(async ()=>{
        //因為下面有 await，所以.then要加入async
        console.dir(arrLink, {depth: null});

        //若是檔案不存在，則新增檔案，並同時寫入內容
        if(!fs.existsSync("downloads/youtube.json")){
            await writeFile("downloads/youtube.json", JSON.stringify(arrLink, null, 4)) //取代 null, 縮排4格
        }
        console.log("Done");
    })
}catch(err){
    console.log(err);
}
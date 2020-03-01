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

//關鍵字
let strKeyword = "node.js";

//進行檢索（搜尋職位名稱）
async function search(){
    console.log("Start search");

    //輸入關鍵字，選擇地區，再按下地區
    await nightmare
    .goto('https://www.104.com.tw/jobs/main/', headers)
    .type('input#ikeyword', strKeyword) //輸入關鍵字
    .wait(2000) //等待數秒
    .click('span#icity') //按下「地區」
    .wait(2000)
    .click('.category-picker-checkbox-input input[value="6001001000"]') //台北
    .click('.category-picker-checkbox-input input[value="6001002000"]') //新北
    .wait(2000)
    .click('.category-picker__modal-footer button.category-picker-btn-primary') //按下確定
    .click('button.js-formCheck') //按下搜尋
    .catch(err=>{
        throw err;
    })
}

//選擇全職、兼職...選項

async function setJobType(){
    console.log("Setting job type");

    await nightmare
    .wait(2000)
    .click('ul#js-job-tab > li[data-value="1"]') //點選全職
}


//動態生成頁面
async function scroll(){
    console.log("Start scroll");

    let currentHeight = 0;
    let offset = 0;

    while(offset <= currentHeight){
        currentHeight = await nightmare.evaluate(()=>{
            return document.documentElement.scrollHeight;
        })

        offset += 500;
        await nightmare.scrollTo(offset, 0).wait(500);
        
        //console.log(`currentHeight = ${currentHeight}, offset = ${offset}`);

        //接近底部時，按下一頁
        //在自動產生內容前，先按按鈕
        if( (currentHeight - offset) < 2000 && await nightmare.exists('button.js-more-page')){
            await _nextPage();
        }
    }
}

//按下一頁
async function _nextPage(){
    console.log("next page");
    ``
    await nightmare
    .wait('button.js-more-page')
    .click('button.js-more-page')

}

//分析整理搜集資訊
async function parseHtml(){

    console.log("Start parsing html")

    let html = await nightmare.evaluate(()=>{
        return document.documentElement.innerHTML;
    })

    //存放資訊的物件
    let obj = {}; 

    //將重要資訊放到陣列中
    $(html).find('div#js-job-content article.job-list-item')
    .each((index, el)=>{
        let left = $(el).find('.b-block__left');
        
        let title = left.find('h2.b-tit a.js-job-link').text(); //職缺名稱
        let link = 'https:' + left.find('h2.b-tit a.js-job-link').attr('href'); //連結
        let location = left.find('ul.job-list-intro li:eq(0)').text(); //地址
        let company = left.find('ul.b-list-inline.b-clearfix li a').text().trim(); //公司
        let companyLink = 'https:' + left.find('ul.b-list-inline.b-clearfix li a ').attr('href'); //公司連結
        let category = left.find('ul.b-list-inline.b-clearfix li:eq(2)').text(); //公司類別
        
        obj.keyword = strKeyword;
        obj.title = title;
        obj.link = link;
        obj.location = location;
        obj.company = company;
        obj.companyLink = companyLink;
        obj.category = category;

        arrLink.push(obj);

        obj = {};
    })
}


//關閉程式
async function close(){
    await nightmare.end((err)=>{
        if(err) throw err;
        console.log("Nightmare is closed");
    })
}

//讓程式一個個執行
async function asyncArray(functionList){
    for(let func of functionList){
        await func();
    }
}

//執行
try{
    asyncArray([search, setJobType, scroll, parseHtml, close]).then(async ()=>{
        //因為下面有 await，所以.then要加入async
        console.dir(arrLink, {depth: null});

        await writeFile("downloads/104.json", JSON.stringify(arrLink, null, 4)) //取代 null, 縮排4格

        console.log("Done");
    })
}catch(err){
    console.log(err);
}
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
let arrList = [];

//第幾頁，debug用
let pages = 1;

//關鍵字
let keyword = 'bnha';

//搜尋關鍵字
async function search(){
    console.log("Searching keyword...")

    let link = ""
    let author = ""
    let title = ""

    await nightmare
    .goto('https://www.pixiv.net/', headers)
    .type('input._2tR5RNf', keyword)
    .wait(500)
    .type('input._2tR5RNf', '\u000d') // press enter
    .wait('a.iYABaT')
    .click('a.iYABaT:nth-child(2)')
    .catch(err=>{
        console.log(err)
    })
}

//取得頁面上的所有照片
async function getImgs(){
    console.log("Getting images...")

    //取得這一頁的html
    let html = await nightmare
    .wait(3000)
    .evaluate(()=>{
        return document.documentElement.innerHTML
    })
    .catch(err=>{
        console.log(err)
    })

    //取得照片資訊
    await $(html).find('.fRrZrZ.fRrZrZ.fRrZrZ')
    .each((index, element)=>{
        link = $(element).find('a.sc-LzLqK.hFVhqR').attr('href')
        title = $(element).find('a.sc-LzLqK.hFVhqR').text()
        author = $(element).find('.hRXAiG .kITUvc').text()

        arrList.push({
            title,
            link,
            author
        })
    })

    //若有箭頭 > ，則到下一頁
    if( $(html).find('div.sc-AykKE.fQva-dy > div.sc-LzOhP.fSkKZQ > div > section:nth-child(3) > div.sc-LzNPy.fNLrs > div > nav > a:nth-child(9)').attr('aria-disabled') === 'false'){
        //測驗用，所以只要前兩頁就好
        if(pages >= 1) return;
        await nextPage();
    }
}

//到下一頁，再取得照片（執行上一步）
async function nextPage(){
    console.log("Going to the next page...")
    pages++;

    await nightmare
    .click('div.sc-AykKE.fQva-dy > div.sc-LzOhP.fSkKZQ > div > section:nth-child(3) > div.sc-LzNPy.fNLrs > div > nav > a:nth-child(9)')
    .catch(err=>{
        console.log(err)
    })

    //取得該頁面的所有照片
    await getImgs();
}

//取得作品資訊
async function getInfo(){
    console.log("Getting info...")

    let html = "";
    let tags = [];
    let imgs = [];
    let likes = 0; //按讚
    let views = 0; //觀看
    let saves = 0; //收藏
    let date = "";

    for(let i = 0 ; i < arrList.length ; i++){
        html = await nightmare
        .goto('https://www.pixiv.net' + arrList[i].link)
        .wait('section.sc-fzXfNi.sc-fzXfNj.bFXRJE')
        .evaluate(()=>{
            return document.documentElement.innerHTML
        })
        .catch(err=>{
            console.log(err)
        })

        likes = $(html).find('ul.sc-LzOlb.gqBSbO li dd').eq(0).text();
        saves = $(html).find('ul.sc-LzOlb.gqBSbO li dd').eq(1).text();
        views = $(html).find('ul.sc-LzOlb.gqBSbO li dd').eq(2).text();
        date = $(html).find('.sc-LzOle.bmDvo').text();

        //如果超過一張圖片
        if($(html).find('div.sc-fzXfNh.cnQLcv > div > div.sc-LzOmW.gufuPE > div > div > button').length > 0){

            //點擊展開
            await nightmare
            .click('div.sc-fzXfNh.cnQLcv > div > div.sc-LzOmW.gufuPE > div > div > button')

            //開始捲動
            await scroll();

            //取得頁面html
            html = await nightmare
            .evaluate(()=>{
                return document.documentElement.innerHTML
            })
            .catch(err=>{
                console.log(err)
            })
        }

        //尋找照片連結
        $(html).find('main section figure .sc-LzOjf.kdLUPB')
        .each((index, element)=>{
            imgs.push($(element).find('img').attr("src"))
        })

        //尋找標籤
        $(html).find('ul._1LEXQ_3 li')
        .each((index, element)=>{
            tags.push($(element).text())
        })

        arrList[i] = {...arrList[i], likes, saves, views, date, tags, imgs}
        //console.dir(imgs, {depth: null})
        
        //初始化
        imgs = []
        tags = []
    }
}

//捲動
async function scroll(){
    let documentHeight = 0;
    let offset = 0;

    let html = await nightmare.evaluate(() => document.documentElement.innerHTML);

    //取得照片總數
    let pattern = /\/(\d+)/g;
    let imgTotalStr = $(html).find('div.sc-LzOix.gecvsx > div > div > div > div > div').text()
    let imgTotal = +pattern.exec(imgTotalStr)[1]
    let lastImg = null;

    //開始滾動
    while(offset <= documentHeight){
        documentHeight = await nightmare.evaluate(()=>{
            return document.documentElement.scrollHeight;
        })

        //如果當前dom裡，最後一張照片已經找到了，則停止滾動
        html = await nightmare.evaluate(()=>{
            return document.documentElement.innerHTML;
        })

        lastImg = $(html).find(`div.sc-fzXfNh.cnQLcv > div > figure > div > div:nth-child(${imgTotal+1}) > div.sc-LzOhp.epZwzJ > a > img`)

        if(lastImg.length > 0){
            break;
        }
        
        offset += 500;

        await nightmare.scrollTo(offset, 0)
        .wait(500);
    }
}


//關閉nightmare
async function close(){
    await nightmare.end((err)=>{
        if(err) throw err;
        console.log("Nightmare is closed")
    })
}

//讓程式一個一個執行
async function asyncArray(functionList){
    for(let func of functionList){
        await func();
    }
}

//執行
try{
    asyncArray([search, getImgs, getInfo, close]).then( async()=>{
        await writeFile('downloads/pixiv.json', JSON.stringify(arrList, null, 4))

        console.log("done")
        console.log(pages)
        //console.dir(arrList, {depth: null})

    })
}catch(err){
    throw err;
}
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
let arrBooks = [];

async function getBooks(){

    console.log("Preparing to start...")
    let html = await nightmare
    .goto('https://www.bookwormzz.com/zh/', headers)
    .wait(2000)
    .evaluate(()=>{
        return document.documentElement.innerHTML
    })

    let objBook = {}

    let headings = $(html).find('.ui-collapsible-heading')
    let bookTitle = ""
    let id = 0
    let episodesHtml = null
    let episodes = []
    let episode = 0
    let episodeTitle = ""

    //取得每一本書的書名
    for(let i = 0 ; i < headings.length ; i++){
        
        id = i+0
        bookTitle = $(html).find('.ui-collapsible-heading').eq(i).text()
        
        episodesHtml = $(html).find('.ui-collapsible-content').eq(i).find('.ui-listview li')

        //取得該書的每一冊
        for(let j = 0 ; j < episodesHtml.length ; j++){
            episode = j
            episodeTitle = episodesHtml.eq(j).text()
            episodeUrl = episodesHtml.eq(j).find('a.ui-btn').attr('href')
            episodeUrl = "https://www.bookwormzz.com" + (episodeUrl.replace('../', '/'))
            
            episodes.push({
                episode,
                title : episodeTitle,
                url : episodeUrl,
            })
        }

        //確定有內容再放入arrBooks(也就是排除最後三個)
        if(episodes.length > 0 && episodeUrl !== '../%E9%87%91%E5%BA%B8%E3%80%8A%E7%99%BD%E9%A6%AC%E5%98%AF%E8%A5%BF%E9%A2%A8%E3%80%8B.php/0.xhtml'){
            objBook = {
                id : id,
                title : bookTitle,
                episodes : episodes
            }
            arrBooks.push(objBook)

            episodes = []
            objBook = {}
        }
    }    
}

async function getChapters(){
    console.log("Getting chapters...")
    let html = ""
    let chapters = []
    let chapterHtml = ""
    let chapter = 0
    let chapterUrl = ""
    let chapterTitle = ""

    //取得每一本書
    for(let i = 0 ; i < arrBooks.length ; i++){
        //取得該書每一冊
        for(let j = 0 ; j < arrBooks[i].episodes.length ; j++){
            html = await nightmare
            .goto(arrBooks[i].episodes[j].url)
            .wait('.ui-navbar .ui-block-c a#toc_list')
            .click('.ui-navbar .ui-block-c a#toc_list')
            .evaluate(()=>{
                return document.documentElement.innerHTML
            })

            chapterHtml = $(html).find('.ui-content ul li a.ui-link')
            
            //取得每一冊的章節
            for(let k = 0 ; k < chapterHtml.length ; k++){

                chapter = k+1
                chapterTitle = $(html).find('.ui-content ul li').eq(k).find('a.ui-link').text()
                chapterUrl = $(html).find('.ui-content ul li').eq(k).find('a.ui-link').attr("href")
                chapterUrl = "https://www.bookwormzz.com" + chapterUrl

                chapters.push({
                    chapter,
                    title: chapterTitle,
                    url: chapterUrl
                })
            }
            
            //console.log(chapters)
            arrBooks[i].episodes[j].chapters = chapters
            chapters = []
        }
    }
}

async function getContent(){
    let html = ""
    for(let i = 0 ; i < arrBooks.length ; i++){
        for(let j = 0 ; j < arrBooks[i].episodes.length ; j++){
            for(let k = 0 ; k < arrBooks[i].episodes[j].chapters.length ; k++){
                html = await nightmare
                .goto(arrBooks[i].episodes[j].chapters[k].url)
                .evaluate(()=>{
                    return document.documentElement.innerHTML
                })

                $(html).find('#html.ui-content div').text()

            }
        }
    }
}

async function end(){
    await nightmare.end(err=>{
        if(err) throw err;
        console.log("Nightmare is closed")
    })
}

//到網頁->點選第一部小說->點選第一冊->點選目錄->點選章節->取得所有文字

//到網頁->先取得所有小說名字,url,冊 => [{title, url, episodes:[ 1, 2, 3]}, {title, url, episodes: [1,2,3]}]
//再到個別冊取得章節 => episodes.push [{title, url}, {title, url}]
//再到個別章節的url取得內容 chapters[i].push [{content : ""}, {content : ""}]  

/* 

[
    {
        "id" : 1,
        "title" : "射雕英雄傳",
        "episodes":[
        {
            "episode" : 1,
            "title" : "射雕英雄傳（一）",
            "url" : "...",
            "chapters" : [
                {
                    "chapter" : 1
                    "title" : "第一回 風雪經變"
                    "url" : "..."
                    "content" : "..."
                },
                {
                    "chapter" : 2
                    "title" : "第二回 "
                    ...
                }
            ]
        },{
            "episode" : 2,
            "title" : "射雕英雄轉（二）",
            "url" : "...",
            "chapters" : [...]
        }
    },{
        "id" : 2,
        "title" : "神鵰俠侶",
        ...
    }
]
*/


async function asyncArray(funcList){
    for(let func of funcList){
        await func();
    }
}

try{
    asyncArray([getBooks, getChapters, end]).then(async ()=>{
        console.log("done")
        console.dir(arrBooks, {depth : null})

        // await writeFile("downloads/books.json", JSON.stringify(arrLink, null, 4))
        // console.log("done")
    })

}catch(err){
    console.log("error : " + err)
}
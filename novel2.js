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

    console.log("Getting books...")

    let objBook = {}

    let bookTitle = ""
    let id = 0
    let episodesHtml = null
    let episodes = []
    let episode = 0
    let episodeTitle = ""

    //取得每一本書的書名

    await $(html).find('.epub.ui-collapsible.ui-collapsible-inset.ui-corner-all')
    .each((index, element)=>{

        //避免爬太多
        //if(index > 1) return;

        id = index+1
        bookTitle = $(element).find('h2.ui-collapsible-heading').text()

        //取得該書的每一冊
        $(element).find('ul.ui-listview li')
        .each((indx, elm)=>{
                episode = indx+1
                episodeTitle = $(elm).text()
                episodeUrl = $(elm).find('a.ui-btn').attr('href')
                
                episodeUrl = "https://www.bookwormzz.com" + (episodeUrl.replace('../', '/'))

                episodes.push({
                    episode,
                    title : episodeTitle,
                    url : episodeUrl,
                })
        })

        //確定有內容再放入arrBooks(也就是排除最後三個)
        if(episodes.length > 0 && episodeUrl !== 'https://www.bookwormzz.com/%E9%87%91%E5%BA%B8%E3%80%8A%E7%99%BD%E9%A6%AC%E5%98%AF%E8%A5%BF%E9%A2%A8%E3%80%8B.php/0.xhtml'){
            
            objBook = {
                id : id,
                title : bookTitle,
                episodes : episodes
            }
            arrBooks.push(objBook)

            episodes = []
            objBook = {}
        }
    })      
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
            .wait('.ui-content')
            .evaluate(()=>{
                console.log("hi")
                return document.documentElement.innerHTML
            })

            //取得每一冊的章節
            chapterHtml = $(html).find('.ui-content ul li a.ui-link')
            .each((index, element)=>{
                chapter = index+1
                chapterTitle = $(element).text()
                chapterUrl = $(element).attr("href")
                chapterUrl = "https://www.bookwormzz.com" + chapterUrl

                chapters.push({
                    chapter,
                    title: chapterTitle,
                    url: chapterUrl
                })
            })
            
            //console.log(chapters)
            arrBooks[i].episodes[j].chapters = chapters
            chapters = []
        }
    }
}

async function getContent(){
    console.log("Getting contents...")
    let html = ""
    let pattern = /[\u4E00-\u9FA5《》○\n　]+\n([\u4E00-\u9FA5《》○\n　：「」，！？。、※…『』；]+)/g
    let arrMatch = null
    let text = ""
    let content =""

    //書
    for(let i = 0 ; i < arrBooks.length ; i++){
        //console.log("book: "+arrBooks[i].title)
        //冊
        for(let j = 0 ; j < arrBooks[i].episodes.length ; j++){
            //console.log("episode: "+arrBooks[i].episodes[j].title)
            //章節
            for(let k = 0 ; k < arrBooks[i].episodes[j].chapters.length ; k++){
                // console.log("chapter: "+arrBooks[i].episodes[j].chapters[k].title)

                // console.log(arrBooks[i].episodes[j].chapters[k].url)
                html = await nightmare
                .goto(arrBooks[i].episodes[j].chapters[k].url)
                .wait('#html.ui-content > div')
                .evaluate(()=>{
                    return document.documentElement.innerHTML
                })

                content = await $(html).find('#html.ui-content > div').text()
                // content = content.split('\n')
                // content = content[content.length - 1 ]
                content = content.replace(/\n/g, '')
                content = content.replace(/　　/g, '')
                
                // console.log(`i(book): ${i}, j(episode): ${j}, k(chapter): ${k}`)
                //if((i=== 0 && j===0 && k===9) || (i===0 && j===1 && k===0)) console.log(contentTest)

                arrBooks[i].episodes[j].chapters[k].content = content

                //console.log(content)

            }
            //console.dir(arrBooks[0], {depth : null})
        }
    }
}

async function end(){
    await nightmare.end(err=>{
        if(err) throw err;
        console.log("Nightmare is closed")
    })
}

async function asyncArray(funcList){
    for(let func of funcList){
        await func();
    }
}

try{
    asyncArray([getBooks, getChapters, getContent, end]).then(async ()=>{
        //console.dir(arrBooks, {depth : null})

        await writeFile("downloads/books.json", JSON.stringify(arrBooks, null, 4))
        console.log("done")
    })

}catch(err){
    console.log("error : " + err)
}
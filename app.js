const host = 3000;

let user = undefined;

const path = require("path");
const express = require("express");
const { PrismaClient } = require('@prisma/client');
const { application } = require("express");
const { isErrored } = require("stream");
const prisma = new PrismaClient();
const app = express();
const session = require('express-session');
const { log } = require("console");
app.use(session({ secret: "Secret", resave: false, saveUninitialized: true }));

// Парсинг json
app.use(express.json())

// Путь к директории файлов ресурсов (css, js, images)
app.use(express.static('public'));

// Настройка шаблонизатора
app.set('view engine', 'ejs');

// Путь к директории файлов отображения контента
app.set('views', path.join(__dirname, 'views'));

// Обработка POST-запросов из форм
app.use(express.urlencoded({ extended: true }));

// Запуск веб-сервера по адресу http://localhost:3000
app.listen(host);


// Middleware
function isAuth(req, res, next) {
    if (req.session.auth) {
        next();
    } else {
        res.redirect('/noAuth');
    }
};

function isSeller(req, res, next){
    if (isAuth && user.seller == true)  {
        next();
    }else{
        res.redirect('/');
}}
/**
 * Маршруты
 */
app.get("/", async (req, res) => {
const items= await prisma.items.findMany()

res.render('home',{ 
'items':items,
auth:req.session.auth,
user: user
})
})

app.get("/singIn",(req, res) => {
    res.render('singIn')
})

app.get("/singInError",(req, res) => {
    res.render('singInError')
})

app.get("/authError",(req, res) => {
    res.render('authError')
})

app.post("/singin", async(req, res) => {
    const {name, password} = req.body;
    const thisUser = await prisma.users.findFirst({
        where:{
            name, 
            password
        }
    })
    if(thisUser != null){
        req.session.auth = true;
        user = thisUser;
        res.redirect('/')    
    }else{
        res.redirect('singInError')
    }
    
})

app.get("/auth",(req, res) => {
    res.render('auth')
})

app.post("/newauth", async(req, res) => {
    const {name, password, seller} = req.body;
    let selle = false;
    if(seller == 'true') selle = true
    const oldUser = await prisma.users.findFirst({
        where:{
            name
        }
    });
    if (oldUser == null){
        await prisma.users.create({
            data:{
                name,
                password,
                seller:selle
            },
        })
        req.session.auth = true;
        const thisUser = await prisma.users.findFirst({
            where:{
                name, 
                password
            }
        })
        user = thisUser;
        res.redirect('/');
    }else{
        res.redirect('/authError')
    }
})

app.post("/out", async(req, res) => {
    req.session.auth = false;
    user = undefined;
    res.redirect('/singIn');
})

app.get('/basket',isAuth, async(req, res) => {
    const items = await prisma.basket.findMany({
        where:{
            users_id: user.id
        },
        include:{
            items:true
        }
    })
    // console.log(items);
    res.render('basket', {
        items:items,
        auth:req.session.auth
    })
})

app.post('/gobasket',isAuth, async(req, res) =>{
    const {items_id} =req.body
    const olditems = await prisma.basket.findFirst({
        where:{
            users_id: Number(user.id),
            items_id: Number(items_id)
        }
    })
    if(olditems == null){
        await prisma.basket.create({
            data:{
                users_id: Number(user.id),
                items_id: Number(items_id)
            }
        })
    }
    res.redirect('/');
})

app.post('/outbasket',isAuth, async(req, res) =>{
    const {items_id} = req.body
    // console.log(items_id)
    await prisma.basket.delete({
        where:{
            items_id_users_id: {
        
       
                items_id: Number(items_id),
                        
                       
                users_id: Number(user.id),
        },
    }
    });
     res.redirect('/')

    });

app.get("/newItem",(req, res) => {
   res.render('newItem');
});

app.post('/newitem',isSeller, async(req, res) =>{
    const{title, description, price} = req.body
    const olditem = await prisma.items.findFirst({
        where:{
            title,
            description,
            owner_id: user.id
        }
    })
    if (olditem == null){
        await prisma.items.create({
            data:{
                title,
                description,
                price: Number(price),
                owner_id: Number(user.id)
            }
        })
    }
    // console.log(olditem);
    res.redirect('/');
})

app.get('/items/:id', async(req, res) => {
    const items_id = Number(req.params.id);
    const items = await prisma.items.findFirst({
        where:{
            id: items_id
        },
        include:{
            user: true
        }
    })
    // console.log(items);
    res.render('item', {
        items:items
    })
})

app.get('/noAuth', (req, res) =>{
    res.render('noAuth')
})
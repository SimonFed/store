const host = 3000;

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
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcrypt");

let user = undefined;
const salt = bcrypt.genSaltSync(10);

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

// Путь к директории для загрузок
const upload = multer({ dest: "./public/img/" });

// Функции

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
    const passwordHash = bcrypt.hashSync(password, salt)
    // console.log(passwordHash)
    const thisUser = await prisma.users.findFirst({
        where:{
            name,
            password:passwordHash
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
    const oldUser = await prisma.users.findFirst({
        where:{
            name
        }
    });
    if (oldUser == null){
        if(seller == 'true') selle = true
        const passwordHash = bcrypt.hashSync(password, salt)
        // console.log(passwordHash)
            await prisma.users.create({
                data:{
                    name,
                    password:passwordHash,
                    seller:selle,
                },
            })
            req.session.auth = true;
            const thisUser = await prisma.users.findFirst({
                where:{
                    name
                }
            });
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
    const items_id =req.body.items_id
    console.log(items_id);
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
    }else{
        await prisma.basket.update({
            where:{
                items_id_users_id:{
                users_id: Number(user.id),
                items_id: Number(items_id) 
                }
            },
            data:{
                how_many:Number(olditems.how_many +1)
            }
        })
    }
})

app.post('/outbasket',isAuth, async(req, res) =>{
    const {items_id} = req.body
    // console.log(items_id)
    await prisma.basket.delete({
        where:{
            items_id_users_id: {
                items_id: Number(items_id),    
                users_id: Number(user.id),
        }
    }
    });
     res.redirect('/basket')

    });

app.get("/newItem",(req, res) => {
   res.render('newItem');
});

app.post('/newitem',isSeller, upload.single("image"), async(req, res) =>{
    const{title, description, price} = req.body
    const olditem = await prisma.items.findFirst({
        where:{
            title,
            description,
            owner_id: user.id
        }
    })
    if (olditem == null){
        const tempPath = req.file.path;
        const targetPath = path.join(
            __dirname,
            "./public/img/" + req.file.originalname
        );
    
        fs.rename(tempPath, targetPath, (err) => {
            if (err) console.log(err);
        })
        await prisma.items.create({
            data:{
                title,
                description,
                price: Number(price),
                image_name: req.file.originalname,
                owner_id: Number(user.id)
            }
        })
    }
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

app.post('/1-basket', isAuth, async(req, res) =>{
    const {items_id} =req.body
    const item =await prisma.basket.findFirst({
        where:{
                users_id: Number(user.id),
                items_id: Number(items_id)
            }
    })
    if (item.how_many>1){
    await prisma.basket.update({
        where:{
            items_id_users_id:{
            users_id: Number(user.id),
            items_id: Number(items_id) 
            }
        },
        data:{
            how_many:Number(item.how_many -1)
        }
    })
    }else{
        await prisma.basket.delete({
            where:{
                items_id_users_id: {
                    items_id: Number(items_id),    
                    users_id: Number(user.id),
                }
            }
        })
    }
    res.redirect('/basket');
})

app.post('/1basket', isAuth, async(req, res) =>{
    const{items_id} = req.body
    const item =await prisma.basket.findFirst({
        where:{
                users_id: Number(user.id),
                items_id: Number(items_id)
            }
    })
    await prisma.basket.update({
        where:{
            items_id_users_id:{
            users_id: Number(user.id),
            items_id: Number(items_id) 
            }
        },
        data:{
            how_many:Number(item.how_many +1)
        }
    })
    res.redirect('/basket');
})


app.get('/myItems', isSeller, async(req, res) =>{
    const items = await prisma.items.findMany({
        where:{
            owner_id: user.id
        }
    })
    res.render('myItems', {
        items:items
    })
})

app.post('/deleteMyItem', isSeller, async(req, res) =>{
    const {id} = req.body
    const item = await prisma.items.findFirst({
        where:{
            id:Number(id)
        }
    })
    if (item.owner_id==user.id){
        await prisma.basket.deleteMany({
            where:{
                items_id:Number(id) 
            }
        })
        await prisma.items.deleteMany({
            where:{
                id:Number(id) 
            }
        })
}
    res.redirect('/myItems')
})

app.get('/search', async(req, res) => {
    const search = req.query.search
    const items = await prisma.items.findMany({
        where: {
            title: {
                contains: search,
            },
        },
    });
    res.render('search', {
        items:items,
        auth:req.session.auth
    })
})
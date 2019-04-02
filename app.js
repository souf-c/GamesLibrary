require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const mongoose = require('mongoose');
let port = process.env.PORT;
const apiKey = process.env.API_KEY;
const Schema = mongoose.Schema;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const _ = require('lodash');


mongoose.connect(process.env.MONGODB_SRV, {useNewUrlParser: true});
mongoose.set('useCreateIndex', true);
app.set('view engine', 'ejs');
app.use(express.static(`public/`));
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const gameSchema = new Schema({
    title: String,
    description: String,
    image: String,
    user: String
});
const Game = mongoose.model('Game', gameSchema);


app.get('/', (req, res) => {
    if(req.isAuthenticated()){
        res.redirect('game');
    }else{
        res.render('home');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err) {
        if (err) { 
            console.log(err); 
        }else{
            passport.authenticate('local')(req, res,()=>{
                res.redirect('/game');
            });
        }
    });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    User.register({username: req.body.username, active: false}, req.body.password, (err, user) => {
        if (err) { 
            console.log(err); 
            res.redirect('/register');
        }else{
            passport.authenticate('local')(req, res,()=>{
                res.redirect('/game');
            });
        }
    });
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.post('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get('/game', (req, res) => {
    if(req.isAuthenticated()){
        const userId = req.user._id;
        Game.find({user: userId},(err, posts)=> {
            res.render('game', {
                posts: posts
            });
        });
    }else{
        res.redirect('/login');
    }
});

app.post('/search', (req, res) => {
    if(req.isAuthenticated()){
        const gameSearched = req.body.searchbar;
        const options = {
            method: 'GET',
            url: `https://www.giantbomb.com/api/search/?api_key=${apiKey}&format=json&query=${gameSearched}&resources=game`,
            headers: {
                'User-Agent': 'yukiosan'
            },
            Json: true
        };
        request(options, (err, result, body) => {
            if(err){
                console.log(err);
                res.send('error');
            }else{
                const searchRes = JSON.parse(body);
                const results = searchRes.results;
                const gamesList = [];
                results.forEach(result => {
                    const gameNames = result.name;
                    const gameImages = result.image.medium_url;
                    const gamesDesc = result.deck;
                    const gamesObject = {gameName : gameNames,gameImage : gameImages,gameDesc: gamesDesc}
                    gamesList.push(gamesObject);
                });
                res.render('search', {gamesList: gamesList});
            }
        });
    }else{
        res.redirect('/login');
    }
});

app.post('/newentry', (req, res)=> {
    if(req.isAuthenticated()){
        const gameName = req.body.gameName;
        const gameImage = req.body.gameImage;
        const gamedesc = req.body.gamedesc;
        const userId = req.user._id;
        const gameEntry = new Game({title: gameName, description: gamedesc, image: gameImage, user: userId});
        gameEntry.save();
        res.redirect('/game');
    }else{
        res.redirect('/login');
    }
});

app.get('/:title', (req, res) => {
    if(req.isAuthenticated()){
        const gameTitle = _.lowerCase(req.params.title);
        Game.find((err, games)=> {
            games.forEach(game => {
                const storedGame = _.lowerCase(game.title);
                if (storedGame === gameTitle) {
                    res.render('post', {title: game.title, image: game.image, desc: game.description })
                }
            });
        });
    }else{
        res.redirect('/login');
    }
});

app.post('/deletepost', (req, res) =>{
    if(req.isAuthenticated()){
        Game.deleteOne({_id: req.body.gameid}, (err)=> {});
        res.redirect('/game');
    }else{
        res.redirect('/login');
    }
});


if (port == null || port == "") {
    port = 3000;
  }
app.listen(port, () => console.log(`app listening on port ${port}!`));
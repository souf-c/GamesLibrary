require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const mongoose = require('mongoose');
let port = process.env.PORT;
const apiKey = process.env.API_KEY;
const Schema = mongoose.Schema;
const _ = require('lodash');


mongoose.connect(process.env.MONGODB_SRV, {useNewUrlParser: true});
app.set('view engine', 'ejs');
app.use(express.static(`public/`));
app.use(bodyParser.urlencoded({extended: true}));


const gameSchema = new Schema({
    title: String,
    description: String,
    image: String
});
const Game = mongoose.model('Game', gameSchema);


app.get('/', (req, res) => {
    Game.find((err, posts)=> {
        res.render('home', {
            posts: posts
        });
    });
});

app.post('/search', (req, res) => {
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
});

app.post('/newentry', (req, res)=> {
    const gameName = req.body.gameName;
    const gameImage = req.body.gameImage;
    const gamedesc = req.body.gamedesc;
    const gameEntry = new Game({title: gameName, description: gamedesc, image: gameImage});
    gameEntry.save();
    res.redirect('/');
});

app.get('/:title', (req, res) => {
    const gameTitle = _.lowerCase(req.params.title);
    Game.find((err, games)=> {
        games.forEach(game => {
            const storedGame = _.lowerCase(game.title);
            if (storedGame === gameTitle) {
                res.render('post', {title: game.title, image: game.image, desc: game.description, id: game._id })
            }
        });
    });
});

app.post('/deletepost', (req, res) =>{
    Game.deleteOne({_id: req.body.gameid}, (err)=> {});
    res.redirect('/');
});


if (port == null || port == "") {
    port = 3000;
  }
app.listen(port, () => console.log(`app listening on port ${port}!`));
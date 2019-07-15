var express = require("express"),
    app = express(),
    request = require("request"),
    mysql = require('mysql'),
    bodyParser = require("body-parser"),
    crypto = require('crypto'),
    session = require('express-session');

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chad'
});

connection.connect(function(err){
    if(!err) {
        console.log("Database is connected.");
    } else {
        console.log("Error connecting database.");
    }
    });

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine","ejs");
app.use(session({
    secret: 'secret', 
    cookie: {maxAge: 60 * 1000 * 30} 
}));
var salted = function(password,salt){
    var hash = crypto.createHmac('md5',salt);
    var hashValue = hash.update(password).digest('hex');
    return {
        password:hashValue,
        salt:salt
    }
}

var md5_salted = function(passwordObject){
    var password = passwordObject.password;
    var salt = passwordObject.salt;
    var md5 = crypto.createHash('md5');
    var result = md5.update(password).digest('hex');
    return{
        password:result,
        salt:salt
    }
}

app.get("/",function(req,res){
    
    res.render("index",{currentUser:req.session.loginUser})
});
app.post("/login",function(req,res){
    var username = req.body.username;
    var rowpassword = req.body.password;
    //console.log(req.body);
    connection.query("SELECT salt FROM `ilance_users` WHERE username = ?",[username],function(err,salt){
        if (salt.length<=0) {
            res.status(401).end('Incorrect Username and/or Password!');
            console.log("wrong username or password!");
        }
        else{
            console.log(salt[0].salt);
            connection.query("SELECT password FROM `ilance_users` WHERE username = ?",[username],function(err,hashedPassword){
                var hashed = md5_salted(salted(rowpassword,salt[0].salt));
                console.log(hashedPassword[0].password);
                console.log(hashed.password);
                if (hashed.password==hashedPassword[0].password){
                    req.session.loginUser = username;
                    res.render("test",{currentUser:req.session.loginUser});
                }
                else{
                    res.status(401).end('Incorrect Username and/or Password!');
                    console.log("wrong username or password!");
                }
            })
        }
    })
    
});
app.get("/logout",function(req,res){
    req.session.destroy(function(err){
        res.redirect("/");
    })
})
var genRandomString = function(length){
    return crypto.randomBytes(Math.ceil(length/2))
            .toString('hex') /** convert to hexadecimal format */
            .slice(0,length);   /** return required number of characters */
};
app.get("/register",function(req,res){
    res.render("register");
});

app.post("/register",function(req,res){
    var username = req.body.username;
    var password = req.body.password;
    var salt = genRandomString(5);
    var hashedPassword = md5_salted(salted(password,salt));
    connection.query("INSERT IGNORE INTO `ilance_users`(username,password,salt) VALUES (?,?,?)",[username,hashedPassword.password, salt],function(err,result){
        if (err) {
            console.log(err);
            return res.render("register");
        }
        res.redirect("/");
    });
});
app.get("/table",function(req,res){
    var order = req.param('orderby');
    var sql = "SELECT project_title, username, categoryname FROM (SELECT project_title, username,cid FROM ilance_projects JOIN ilance_users ON ilance_projects.user_id = ilance_users.user_id) i LEFT JOIN categories ON i.cid = categories.cid "+order;
    connection.query(sql,function(err,result){
        if (err){
            console.log(err);
        }
        console.log(sql);
        res.json(result);
    });
});


app.listen(3000,process.env.IP,function(){
    console.log("connected");
});
const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");
const session = require("express-session");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Set up session middleware
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

// Set the views directory and view engine
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");

// Serve static files (images, CSS, etc.) from the public folder
app.use(express.static(path.join(__dirname, "../public")));

// Connect to MongoDB with error handling
const mongoUrl = "mongodb://localhost:27017";
const client = new MongoClient(mongoUrl, { useUnifiedTopology: true });
let db;

client.connect()
    .then(() => {
        db = client.db("myDB");
        console.log("Connected to MongoDB");
    })
    .catch(err => {
        console.error("Failed to connect to MongoDB", err);
    });

// Serve the login page
app.get("/login", (req, res) => {
    res.render("login", );
});
// Handle the login POST request
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.collection("myCollection").findOne({ username: username })
        .then(user => {
            if (user) {
                if (user.password === password) {
                    req.session.username = username;
                    res.json({ success: true, message: 'Login successful!' });
                } else {
                    res.json({ success: false, message: 'Incorrect password' }); 
                }
            } else {
                res.json({ success: false, message: 'No user found with that username' }); 
            }
        })
        .catch(err => {
        
            req.session.message = "An error occurred: " + err.message;
            res.json({ success: false, message: 'An error occurred. Please try again later.' });
        });
});


// Handle registration POST request
app.post('/register', (req, res) => {
    const { username, password } = req.body;

   
    db.collection("myCollection").findOne({ username: username })
        .then(existingUser => {
            if (existingUser) {
                return res.json({ success: false, message: "Username is already taken" });
            } else {
                db.collection("myCollection").insertOne({ username: username, password: password, wantToGo: [] })
                    .then(() => {
                        req.session.username = username;
                        res.json({ success: true, message: "Registration successful! Please login." });
                    })
                    .catch(err => {
                        res.json({ success: false, message: "An error occurred: " + err.message });
                    });
            }
        })
        .catch(err => {
            res.json({ success: false, message: "An error occurred: " + err.message });
        });
});

function isAuthenticated(req, res, next) {
    if (req.session.username) {
        next();
    } else {
        res.redirect('/login');
    }
}
const places = ["paris", "rome", "inca", "annapurna", "bali", "santorini"];

// Define the POST route for /search
app.post('/search',isAuthenticated, (req, res) => {
    const searchQuery = req.body.Search || "";
    const filteredPlaces = places.filter(place =>
        place.toLowerCase().includes(searchQuery.toLowerCase()) 
    );
    
    if (filteredPlaces.length > 0) {
        res.render('searchresults', { places: filteredPlaces });
    } else {
        res.render('searchresults', { places: [] }); 
    }
});
app.get('/home', isAuthenticated, (req, res) => {
    res.render("home", { username: req.session.username });
});

app.get('/hiking', isAuthenticated, (req, res) => {
    res.render("hiking", { username: req.session.username });
});

app.get('/cities', isAuthenticated, (req, res) => {
    res.render("cities", { username: req.session.username });
});

app.get('/islands', isAuthenticated, (req, res) => {
    res.render("islands", { username: req.session.username });
});

app.get('/annapurna', isAuthenticated, (req, res) => {
    const message = req.session.message || '';
    res.render("annapurna", { username: req.session.username ,message: message});
});

app.get('/bali', isAuthenticated, (req, res) => {
    const message = req.session.message || '';
    res.render("bali", { username: req.session.username ,message: message});
});


app.get('/santorini', isAuthenticated, (req, res) => {
    const message = req.session.message || '';
    res.render("santorini", { username: req.session.username ,message: message});
});

app.get('/inca', isAuthenticated, (req, res) => {
    const message = req.session.message || '';
    res.render("inca", { username: req.session.username, message: message });
});

app.get('/paris', isAuthenticated, (req, res) => {
    const message = req.session.message || '';
    res.render("paris", { username: req.session.username, message: message });
});

app.get('/registration', (req, res) => {
    res.render("registration");
});

app.get('/searchresults', isAuthenticated, (req, res) => {
    res.render("searchresults", { username: req.session.username });
});

app.get('/rome', isAuthenticated, (req, res) => {
    const message = req.session.message || '';
    res.render("rome", { username: req.session.username, message: message });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Failed to destroy session:", err);
        }
        res.redirect('/login');
    });
});


app.post("/add-to-wanttogo", isAuthenticated, async (req, res) => {
    const { destination } = req.body;
    const username = req.session.username;

    try {
        
        const user = await db.collection("myCollection").findOne({
            username: username,
            wantToGo: destination,
        });

        if (user) {
            res.render(destination, {
                username: username,
                message: "This destination is already in your list!",
            });
        } else {
            
            await db.collection("myCollection").updateOne(
                { username: username },
                { $push: { wantToGo: destination } }
            );
            res.render(destination, {
                username: username,
                message: "Destination has been added to your list!",
            });
        }
    } catch (err) {
        console.error("Error adding destination:", err);
        res.render(destination, {
            username: username,
            message: "An error occurred while adding the destination.",
        });
    }
});

app.get('/wanttogo', isAuthenticated, (req, res) => {
    const username = req.session.username;

    if (!username) {
        return res.redirect('/login'); 
    }

    db.collection("myCollection").findOne({ username: username }, { projection: { wantToGo: 1 } })
        .then(user => {
            if (user && user.wantToGo) {
                res.render("wanttogo", { 
                    username, 
                    destinations: user.wantToGo, 
                    message: null 
                });
            } else {
                res.render("wanttogo", { 
                    username, 
                    destinations: [], 
                    message: "No destinations found." 
                });
            }
        })
        .catch(err => {
            console.error("Error fetching destinations:", err);
            res.redirect('/home');
        });
});

app.post('/delete-destination', isAuthenticated, (req, res) => {
    const username = req.session.username;
    const index = parseInt(req.body.index, 10);

    db.collection("myCollection").findOne({ username: username })
        .then(user => {
            if (user && user.wantToGo && user.wantToGo.length > index) {
                user.wantToGo.splice(index, 1);
                return db.collection("myCollection").updateOne(
                    { username: username },
                    { $set: { wantToGo: user.wantToGo } }
                );
            }
        })
        .then(() => res.redirect('/wanttogo'))
        .catch(err => {
            console.error("Error deleting destination:", err);
            res.redirect('/wanttogo');
        });
});

// Start the server
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

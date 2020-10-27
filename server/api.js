var bodyParser = require('body-parser')

import { Router } from "express";

import { Connection } from "./db";

import { AuthorizationCode } from "simple-oauth2";

const router = new Router();
var cors = require("cors");
router.use(cors());
router.use(bodyParser.json())

const { Octokit } = require("@octokit/core");

const client = new AuthorizationCode({
  client: {
    //these would come from the github where the app is registered.
    id: process.env.CLIENT_ID,
    secret: process.env.CLIENT_SECRET,
  },
  auth: {
    tokenHost: "https://github.com",
    tokenPath: "/login/oauth/access_token",
    authorizePath: "/login/oauth/authorize",
  },
});

const authorizationUri = client.authorizeURL({
  //we can put in the redirect_uri when we deploy the app
  redirect_uri: "https://designed-gd.herokuapp.com/login",
  scope: "user",
  // expires_in: '30' something to look into later
  // state: '3(#0/!~',
});

router.get("/login", (req, res) => {
  console.log(authorizationUri);
  res.redirect(authorizationUri);
});

// Callback service parsing the authorization token and asking for the access token
router.get("/callback", async (req, res) => {
  const { code } = req.query;
  const options = {
    code,
  };

  try {
    const accessToken = await client.getToken(options);
    console.log("acces token", accessToken);
    //accessing the token number from the above
    const token = accessToken.token.access_token;

    //authenticates the access_token sent by github during the Oauth2 flow
    const octokit = new Octokit({
      auth: token,
    });

    //this returns the authenticated user's username/login
    const { data } = await octokit.request("/user");
    return res.status(200).json(data.login);
  } catch (error) {
    console.error("Access Token Error", error.message);
    return res.status(500).json("Authentication failed");
  }
});

router.get("/", (_, res, next) => {
  Connection.connect((err) => {
    if (err) {
      return next(err);
    }
    res.json({ message: "Hello, world!" });
  });
});
router.get("/graduates", (_, res, next) => {
  console.log('get graduates called')
  Connection.connect((err) => {
    if (err) {
      return next(err);
    }
    Connection.query("SELECT * FROM graduates", (error, result) => {
      console.log('got query')
      if(result){
        res.json(result.rows)}else{
          console.log('got error')
          res.send(error)
        };
      
    } 
    );
  });
});

// create new profile
router.post("/graduates", function (req, res) {
  console.log(req.body)
  const newFirstName = req.body.first_name;
  const newSurname = req.body.surname;
  const github_id = req.body.github_id;
  // const github_name = req.body.githubName;
  //checking if the user is existed in our github table
  Connection.query(
          `insert into graduates (first_name, surname, github_id) values` +
            `($1,$2,$3)`,
          [newFirstName, newSurname, github_id],
          (error, result) => {
            if(result){
              res.status(200).send(result.rows);
            } else {
              res.status(404).send(error)
            } 
          }
          
        );
});
//checking the github username exist in our database
router.get("/accounts/:name", (req, res, next) => {
  const githubName = req.params.name;
  Connection.connect((err) => {
    if (err) {
      return next(err);
    }
    Connection.query(
      "SELECT * FROM github_accounts where account_name=$1 ",
      [githubName],
      (error, result) => {
        if (result.rowCount > 0) {
          let id = result.rows[0].id;
          Connection.query(
            "SELECT * FROM github_accounts GA join graduates G on(GA.id=G.github_id) where GA.account_name=$1 ",
            [githubName],
            (error, result) => {
              if (result.rowCount > 0) res.status(200).json(result.rows);
              else{
                res.status(206).send({ "account_name": githubName, "github_id":id });
              }
            }
          );
        } else
          res
            .status(404)
            .send("this is  github account does not belong to a CYF graduates");
      }
    );
  });
});

router.get("/graduates/:id", (req, res, next) => {
  const github_id = parseInt(req.params.id);
  Connection.connect((err) => {
    if (err) {
      return next(err);
    }
    Connection.query(
      "SELECT * FROM graduates where github_id=$1 ",
      [github_id],
      (error, result) => {
        if (result.rowCount > 0) res.json(result.rows);
        else
          res
            .status(404)
            .send("It has not been added to the graduate table yet");
      }
    );
  });
});

//editing existing graduate
router.put("/graduates/:id", function (req, res) {
  const github_id = parseInt(req.params.id);
  const newFirstName = req.body.first_name;
  const newSurname = req.body.surname;

  Connection.query(
    "update graduates set first_name=$1 ,surname=$2" + "where github_id =$3",
    [newFirstName, newSurname, github_id],
    (error) => {
      if (error == undefined) {
        res.send("graduate " + github_id + " updated.");
      }
    }
  );
});

router.delete("/graduates/:id", function (req, res) {
  let graduateId;
  const github_id = parseInt(req.params.id);
  Connection.query(
    "SELECT * FROM graduates where github_id=$1 ",
    [github_id],
    (error, result) => {
      if (result.rowCount > 0) 
      graduateId=result.rows[0].id;
      Connection.query(
        "delete from graduate_skill  where  graduate_id=$1",
        [graduateId],
        (error) => {
          if (error == undefined) {
            Connection.query(
              "delete from graduates  where  github_id=$1",
              [github_id],
              (error) => {
                if (error == undefined) {
                  res.send("graduate" + github_id + " deleted.");
                }
              }
            );
          }
        }
      );
    }
  );
});

export default router;

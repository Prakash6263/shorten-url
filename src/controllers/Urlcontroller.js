const urlModel = require('../Models/UrlModel')
const shortid = require('shortid');
// const validUrl = require('valid-url')
const redis = require("redis");
const { promisify } = require("util");
//Connect to redis
const redisClient = redis.createClient(
  16368,
  "redis-16368.c15.us-east-1-2.ec2.cloud.redislabs.com",
  { no_ready_check: true }
  
);
redisClient.auth("Y52LH5DG1XbiVCkNC2G65MvOFswvQCRQ", function (err) {
  if (err) throw err;
});
redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



//==========================================================================================

const isValid = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  return true;
};

const isValidRequestBody = function (requestBody) {
  return Object.keys(requestBody).length > 0;
};
// ###############################################################################################################################################3
const shortenUrl = async function (req, res) {
    try {

      const requestBody = req.body;

      if (!isValidRequestBody(requestBody)) {
        return res.status(400).send({
          status: false,
          message: "Invalid request parameters. Please provide URL details",
        });
      }
      const baseUrl = 'http://localhost:3000'
      let longUrl = req.body.longUrl;
  
      if (!isValid(longUrl)) {
        return res
          .status(400)
          .send({ status: false, message: "Please provide Long URL" });
      }
      if (
        !/(ftp|http|https|HTTP|HTTPS):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/.test(
          longUrl
        )
      ) {
        return res
          .status(400)
          .send({
            status: false,
            message: "Invalid URL. Please provide correct URL",
          });
      }
      if (
        !/[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%.\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%\+.~#?&//=]*)/.test(
          longUrl
        )
      ) {
        return res.status(400).send({
          status: false,
          message: "Invalid URL. Please provide correct URL",
        });
      }
        const urlCode = shortid.generate()

        if (isValid(longUrl.trim())) {
            let url = await urlModel.findOne({ longUrl: longUrl }).select({ createdAt: 0, updatedAt: 0, __v: 0 });
            if (url) {
                res.status(200).send({status:true, message: "You have already created shortUrl for the requested URL as given below", data: url.shortUrl })
               
            } else {
                // join the generated short code the the base url
                const shortUrl = baseUrl + '/' + urlCode.toLowerCase()

                // invoking the Url model and saving to the DB
                url =await  urlModel.create({
                    longUrl,
                    shortUrl,
                    urlCode,
                })
                await SET_ASYNC(urlCode.toLowerCase(), longUrl); // save also in caching memory 
                res.status(201).send({ status: true, data: url})
            }
        } else {
            res.status(401).send({ status: false, msg: "Invalid LongUrl" })
        }
    } catch (error) {
        res.status(500).send({ status: false, msg: error.message })
    }
}

//===================================================================================
const getUrl = async function (req, res) {
    try {
        
      let cachedData = await GET_ASYNC(req.params.urlCode.trim().toLowerCase());  //"EX", 20
      if (cachedData) {
        console.log("data from cache memory")
        res.status(302).redirect(cachedData);
      } else {
        const url = await urlModel.findOne({ urlCode: req.params.urlCode });
        if (url) {
          res.status(302).redirect(url.longUrl);
        } else {
          // else return a not found 404 status
          return res.status(404).send({ status: false, msg: "No URL Found" });
        }
      }
      // exception handler
    } catch (err) {
      console.error(err);
      res.status(500).send({status:false, msg:err.message});
    }
  };
  



module.exports.getUrl = getUrl;
module.exports.shortenUrl = shortenUrl
















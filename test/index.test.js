const app = require("../index")
const request = require('supertest');

const expect = require('chai').expect

describe('GET /', function () {
  before((done) => {
    setTimeout(done, 500)
  })
  it('respond with json', function () {
    return request("localhost:5005/zones")
      .get('/')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .then(res => {
        console.log(res.body)
      });
  });
});

// TODO: write more tests

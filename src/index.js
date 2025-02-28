const a = 1;
const b = 2;
const c = a + b;
console.log(c);

const PromiseTry = new Promise((resolve, reject)=>{
    setTimeout(()=>{
        resolve("Success")
    }, 1000)
})

PromiseTry
.then((res)=>{
    console.log(res)
})
.catch((err)=>{
    console.log(err)
}).finally(()=>{
    console.log("Finally executed  ")
})



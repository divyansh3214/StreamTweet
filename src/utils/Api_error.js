  class ApiiError extends Error{
    constructor(
        statuscode,
        message="Internal Server Error",
        errors=[],
        stack=""
    ){
        super(message);
        this.statuscode=statuscode;
        this.message=message;
        this.errors=errors;
        this.data=null;
        this.success=false;
        if(stack){
            this.stack=stack;
        }
        else{
            Error.captureStackTrace(this,this.constructor);
        }
    }
  }
  export default ApiiError;
  class ApiiError extends Error{
    constructor(
        statuscode,
        message="Internal Server Error",
        errors=[],
        statck=""
    ){
        super(message);
        this.statuscode=statuscode;
        this.message=message;
        this.errors=errors;
        this.data=null;
        this.success=false;
        if(statck){
            this.statck=statck;
        }
        else{
            Error.captureStackTrace(this,this.constructor);
        }
    }
  }
  export default ApiiError;
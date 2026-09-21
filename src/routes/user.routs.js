import {Router} from "express";
import {registeruser} from "../controllers/user.conrollers.js";
const router=Router();
router.route("/register").post(registeruser)
export default router;
Important Note: To revert Razorpay simulation in the future, you simply need to change const FORCE_SIMULATION = true; to false in 
Backend/services/razorpayService.js
. The order_test_ checks in the other files are safe to leave as they only trigger on test data.

Your testing environment is now ready.
/**
 * Phone Number Validation Utility
 * 
 * Checks if a phone number exists in any collection (User, Vendor, Seller)
 * Used to prevent duplicate registrations across different roles
 */

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Seller = require('../models/Seller');

// Special bypass number - skips all validation and checks
const SPECIAL_BYPASS_NUMBER = '9755620716';
const SPECIAL_BYPASS_OTP = '123456';

/**
 * Check if phone number is the special bypass number
 * @param {string} phone - Phone number to check
 * @returns {boolean}
 */
function isSpecialBypassNumber(phone) {
  if (!phone) return false;
  // Normalize phone number for comparison - get last 10 digits
  const digits = phone.replace(/[^0-9]/g, '');
  const last10Digits = digits.slice(-10);
  return last10Digits === SPECIAL_BYPASS_NUMBER;
}

/**
 * Check if phone number exists in any collection
 * @param {string} phone - Phone number to check
 * @param {string} excludeRole - Role to exclude from check (e.g., 'user', 'vendor', 'seller')
 * @returns {Promise<{exists: boolean, role: string|null, message: string}>}
 */
async function checkPhoneExists(phone, excludeRole = null) {
  try {
    // Special bypass number - skip all checks
    if (isSpecialBypassNumber(phone)) {
      return {
        exists: false,
        role: null,
        message: null,
      };
    }
    // Check User collection
    if (excludeRole !== 'user') {
      const user = await User.findOne({ phone });
      if (user) {
        return {
          exists: true,
          role: 'user',
          message: 'This phone number is already registered as a User. Please use the User login.',
        };
      }
    }

    // Check Vendor collection
    if (excludeRole !== 'vendor') {
      const vendor = await Vendor.findOne({ phone });
      if (vendor) {
        return {
          exists: true,
          role: 'vendor',
          message: 'This phone number is already registered as a Vendor. Please use the Vendor login.',
        };
      }
    }

    // Check Seller collection
    if (excludeRole !== 'seller') {
      const seller = await Seller.findOne({ phone });
      if (seller) {
        return {
          exists: true,
          role: 'seller',
          message: 'This phone number is already registered as a Seller. Please use the Seller login.',
        };
      }
    }

    return {
      exists: false,
      role: null,
      message: null,
    };
  } catch (error) {
    console.error('Error checking phone number:', error);
    throw error;
  }
}

/**
 * Check if phone number exists in a specific role (for login validation)
 * @param {string} phone - Phone number to check
 * @param {string} role - Role to check ('user', 'vendor', 'seller')
 * @returns {Promise<{exists: boolean, data: object|null}>}
 */
async function checkPhoneInRole(phone, role) {
  try {
    // Special bypass number - return exists: true to allow login flow
    if (isSpecialBypassNumber(phone)) {
      return {
        exists: true,
        data: null, // Will be handled specially in controllers
      };
    }
    
    let data = null;

    switch (role) {
      case 'user':
        data = await User.findOne({ phone });
        break;
      case 'vendor':
        data = await Vendor.findOne({ phone });
        break;
      case 'seller':
        data = await Seller.findOne({ phone });
        break;
      default:
        return { exists: false, data: null };
    }

    return {
      exists: !!data,
      data: data,
    };
  } catch (error) {
    console.error('Error checking phone number in role:', error);
    throw error;
  }
}

module.exports = {
  checkPhoneExists,
  checkPhoneInRole,
  isSpecialBypassNumber,
  SPECIAL_BYPASS_NUMBER,
  SPECIAL_BYPASS_OTP,
};


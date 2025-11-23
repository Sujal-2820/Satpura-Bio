/**
 * Phone Number Validation Utility
 * 
 * Checks if a phone number exists in any collection (User, Vendor, Seller)
 * Used to prevent duplicate registrations across different roles
 */

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Seller = require('../models/Seller');

/**
 * Check if phone number exists in any collection
 * @param {string} phone - Phone number to check
 * @param {string} excludeRole - Role to exclude from check (e.g., 'user', 'vendor', 'seller')
 * @returns {Promise<{exists: boolean, role: string|null, message: string}>}
 */
async function checkPhoneExists(phone, excludeRole = null) {
  try {
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
};


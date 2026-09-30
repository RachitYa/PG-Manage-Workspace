import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── USERS & STAFF ────────────────────────────────────────────────
const USERS = [
  { id: 1, name: 'Ravi Kumar',   phone: '+91 9234567681', bed: 'Bed No. 4', room: 'Room No. 15', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop' },
  { id: 2, name: 'Priya Sharma', phone: '+91 9234567682', bed: 'Bed No. 2', room: 'Room No. 16', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop' },
  { id: 3, name: 'Amit Verma',   phone: '+91 9234567683', bed: 'Bed No. 1', room: 'Room No. 17', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop' },
  { id: 4, name: 'Sneha Kapoor', phone: '+91 9234567684', bed: 'Bed No. 3', room: 'Room No. 18', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop' },
  { id: 5, name: 'Karan Singh',  phone: '+91 9234567685', bed: 'Bed No. 2', room: 'Room No. 15', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop' },
];

const STAFF = [
  { id: 1, name: 'Sachin Kumar', empId: '#1234567', role: 'Manager',       phone: '+91 9234567681', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop' },
  { id: 2, name: 'Rahul Mehta',  empId: '#1234568', role: 'Cafe',          phone: '+91 9234567682', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop' },
  { id: 3, name: 'Deepak Nair',  empId: '#1234569', role: 'Laundry Wala',  phone: '+91 9234567683', img: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop' },
  { id: 4, name: 'Vijay Sharma', empId: '#1234570', role: 'House Keeping', phone: '+91 9234567684', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop' },
  { id: 5, name: 'Suresh Rao',   empId: '#1234571', role: 'House Keeping', phone: '+91 9234567685', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop' },
];

// ─── ALLOTTED ITEMS ────────────────────────────────────────────────
const USER_ALLOTTED = [
  { name: 'Bed',       icon: 'bed',               qty: 1 },
  { name: 'Mattress',  icon: 'airline_seat_flat', qty: 1 },
  { name: 'Bedsheet',  icon: 'layers',            qty: 2 },
  { name: 'Pillow',    icon: 'weekend',           qty: 4 },
  { name: 'Chair',     icon: 'chair',             qty: 2 },
  { name: 'Almirah',   icon: 'door_sliding',      qty: 1 },
  { name: 'Kettle',    icon: 'coffee_maker',      qty: 1 },
  { name: 'Table',     icon: 'table_restaurant',  qty: 1 },
];

const STAFF_ALLOTTED = [
  { name: 'Uniform',        icon: 'checkroom',         qty: 2 },
  { name: 'ID Card',        icon: 'badge',             qty: 1 },
  { name: 'Apron',          icon: 'dry_cleaning',      qty: 2 },
  { name: 'Gloves',         icon: 'back_hand',         qty: 3 },
  { name: 'Mop',            icon: 'cleaning_services', qty: 2 },
  { name: 'Broom',          icon: 'cleaning',          qty: 1 },
  { name: 'Bucket',         icon: 'opacity',      qty: 2 },
  { name: 'Cleaning Spray', icon: 'soap',              qty: 3 },
  { name: 'Safety Shoes',   icon: 'hiking',            qty: 1 },
  { name: 'Dustpan',        icon: 'delete_sweep',      qty: 1 },
];

// ─── PG ITEMS with location availability ─────────────────────────
const PG_ITEMS = [
  { name: 'Bed',               icon: 'bed',                   qty: 100, locations: [{ place: 'Room No. 15', qty: 2, img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&h=300&fit=crop' }, { place: 'Room No. 16', qty: 3, img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop' }, { place: 'Room No. 17', qty: 4, img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=300&fit=crop' }] },
  { name: 'Mattress',          icon: 'airline_seat_flat',     qty: 100, locations: [{ place: 'Room No. 15', qty: 2, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop' }, { place: 'Room No. 16', qty: 3, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop' }] },
  { name: 'Bedsheet',          icon: 'layers',                qty: 100, locations: [{ place: 'Room No. 15', qty: 4, img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop' }, { place: 'Room No. 17', qty: 6, img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop' }, { place: 'Store Room', qty: 20, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }] },
  { name: 'Pillow',            icon: 'weekend',               qty: 100, locations: [{ place: 'Room No. 15', qty: 4, img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=300&fit=crop' }, { place: 'Room No. 16', qty: 3, img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=300&fit=crop' }] },
  { name: 'Washing Machine',   icon: 'local_laundry_service', qty: 4,   locations: [{ place: 'Ground Floor', qty: 2, img: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=400&h=300&fit=crop' }, { place: '1st Floor', qty: 2, img: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=400&h=300&fit=crop' }] },
  { name: 'Chair',             icon: 'chair',                 qty: 100, locations: [{ place: 'Room No. 15', qty: 2, img: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=300&fit=crop' }, { place: 'Common Area', qty: 10, img: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=300&fit=crop' }] },
  { name: 'Almirah',           icon: 'door_sliding',          qty: 50,  locations: [{ place: 'Room No. 15', qty: 2, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop' }, { place: 'Room No. 16', qty: 2, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop' }] },
  { name: 'Kettle',            icon: 'coffee_maker',          qty: 20,  locations: [{ place: 'Room No. 15', qty: 1, img: 'https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=400&h=300&fit=crop' }, { place: 'Kitchen', qty: 2, img: 'https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=400&h=300&fit=crop' }] },
  { name: 'Table',             icon: 'table_restaurant',      qty: 40,  locations: [{ place: 'Room No. 15', qty: 1, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop' }, { place: 'Dining Area', qty: 4, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop' }] },
  { name: 'Wi-fi',             icon: 'wifi',                  qty: 3,   locations: [{ place: 'Ground Floor', qty: 1, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }, { place: '1st Floor', qty: 1, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }, { place: '2nd Floor', qty: 1, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }] },
  { name: 'Fridge',            icon: 'kitchen',               qty: 3,   locations: [{ place: 'Kitchen', qty: 2, img: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=300&fit=crop' }, { place: 'Common Area', qty: 1, img: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=300&fit=crop' }] },
  { name: 'T.V',               icon: 'tv',                    qty: 8,   locations: [{ place: 'Room No. 15', qty: 1, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f4834f?w=400&h=300&fit=crop' }, { place: 'Common Area', qty: 2, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f4834f?w=400&h=300&fit=crop' }] },
  { name: 'Microwave',         icon: 'microwave',             qty: 2,   locations: [{ place: 'Kitchen', qty: 2, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }] },
  { name: 'Gas Stove',         icon: 'outdoor_grill',         qty: 2,   locations: [{ place: 'Kitchen', qty: 2, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }] },
  { name: 'Pillow Cover',      icon: 'king_bed',              qty: 80,  locations: [{ place: 'Store Room', qty: 30, img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=300&fit=crop' }, { place: 'Room No. 15', qty: 4, img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=300&fit=crop' }] },
  { name: 'Chilled R.O Water', icon: 'water_drop',            qty: 5,   locations: [{ place: 'Ground Floor', qty: 2, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }, { place: '1st Floor', qty: 2, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }] },
  { name: 'Attach Bathroom',   icon: 'bathroom',              qty: 12,  locations: [{ place: 'Room No. 15', qty: 1, img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop' }, { place: 'Room No. 16', qty: 1, img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop' }] },
  { name: 'Attach Balcony',    icon: 'balcony',               qty: 8,   locations: [{ place: 'Room No. 18', qty: 1, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }, { place: 'Room No. 19', qty: 1, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }] },
  { name: 'Dining Table',      icon: 'table_bar',             qty: 4,   locations: [{ place: 'Dining Area', qty: 4, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop' }] },
  { name: 'Living Area',       icon: 'living',                qty: 2,   locations: [{ place: 'Ground Floor', qty: 1, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }, { place: '1st Floor', qty: 1, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' }] },
];

// ─── ROOMS with residents linked ──────────────────────────────────
const ROOMS = [
  { id: 1, name: 'Staircase Front', type: 'Double Bed Room', roomNo: 'Room No. 15', beds: 2, img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=200&h=120&fit=crop', residentIds: [1, 5] },
  { id: 2, name: 'Staircase Front', type: 'Triple Bed Room', roomNo: 'Room No. 16', beds: 3, img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=200&h=120&fit=crop', residentIds: [2] },
  { id: 3, name: 'Staircase Front', type: 'Four Bed Room',   roomNo: 'Room No. 17', beds: 4, img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=200&h=120&fit=crop', residentIds: [3] },
  { id: 4, name: 'Staircase Front', type: 'Double Bed Room', roomNo: 'Room No. 18', beds: 2, img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=120&fit=crop', residentIds: [4] },
  { id: 5, name: 'Staircase Front', type: 'Double Bed Room', roomNo: 'Room No. 19', beds: 2, img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=120&fit=crop', residentIds: [] },
];

const ROOM_ITEMS = [
  { name: 'Bed',       icon: 'bed',               qty: 2 },
  { name: 'Mattress',  icon: 'airline_seat_flat', qty: 2 },
  { name: 'Bedsheet',  icon: 'layers',            qty: 4 },
  { name: 'Pillow',    icon: 'weekend',           qty: 4 },
  { name: 'Chair',     icon: 'chair',             qty: 2 },
  { name: 'Almirah',   icon: 'door_sliding',      qty: 2 },
  { name: 'Table',     icon: 'table_restaurant',  qty: 1 },
  { name: 'T.V',       icon: 'tv',                qty: 1 },
];

const BED_INVENTORY = [
  { room: 'Room No. 15', beds: 2 }, { room: 'Room No. 16', beds: 3 }, { room: 'Room No. 17', beds: 4 },
  { room: 'Room No. 18', beds: 2 }, { room: 'Room No. 19', beds: 2 }, { room: 'Room No. 20', beds: 3 },
];

// ─── KITCHEN ──────────────────────────────────────────────────────
const KITCHEN_HARD = [
  { name: 'Peeler',          icon: 'kitchen',         qty: 1 },
  { name: 'Cutting board',   icon: 'space_dashboard', qty: 1 },
  { name: "Chef's knife",    icon: 'restaurant',      qty: 2 },
  { name: 'Whisk',           icon: 'blender',         qty: 4 },
  { name: 'Rolling pin',     icon: 'roller_skating',  qty: 2 },
  { name: 'Blender',         icon: 'blender',         qty: 1 },
  { name: 'Pressure cooker', icon: 'outdoor_grill',   qty: 1 },
];

const KITCHEN_SOFT = [
  { name: 'Cooking Oil', qty: 2,   unit: 'Kg' },
  { name: 'Rice',        qty: 2,   unit: 'Kg' },
  { name: 'Turmeric',    qty: 200, unit: 'Gm' },
  { name: 'Tea',         qty: 200, unit: 'Gm' },
  { name: 'Garam Masala',qty: 200, unit: 'Gm' },
  { name: 'Rajma',       qty: 200, unit: 'Gm' },
  { name: 'Aata',        qty: 10,  unit: 'Kg' },
];

const KITCHEN_REPORT_MONTHLY = [
  'January 2025','February 2025','March 2025','April 2025','May 2025','June 2025',
  'July 2025','August 2025','September 2025','October 2025','November 2025','December 2025',
].map(m => ({ month: m, amount: '25,000' }));

const KITCHEN_TRANSACTIONS = [
  { item: 'Aalu (50kg)', date: '2 January 2025', amount: '5,000', status: 'Paid' },
  { item: 'Gobhi (50kg)', date: '5 January 2025', amount: '5,000', status: 'Paid' },
  { item: 'Rice (25kg)', date: '8 January 2025', amount: '2,500', status: 'Paid' },
  { item: 'Cooking Oil (5L)', date: '10 January 2025', amount: '1,200', status: 'Paid' },
];

// ─── MODULES ──────────────────────────────────────────────────────
const MODULES = [
  { id: 'user-inventory',    label: 'User\nInventory',    icon: 'groups',       gradient: 'linear-gradient(135deg,#0ea5e9,#0891b2)' },
  { id: 'kitchen-inventory', label: 'Kitchen\nInventory', icon: 'kitchen',      gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
  { id: 'pg-inventory',      label: 'PG\nInventory',      icon: 'apartment',    gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  { id: 'room-inventory',    label: 'Room\nInventory',    icon: 'meeting_room', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  { id: 'staff-inventory',   label: 'Staff\nInventory',   icon: 'badge',        gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { id: 'kitchen-report',    label: 'Kitchen\nReport',    icon: 'bar_chart',    gradient: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
];

// ─── ITEM IMAGES ──────────────────────────────────────────────────
const ITEM_IMAGES = {
  'Bed':            'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&h=260&fit=crop',
  'Mattress':       'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=260&fit=crop',
  'Bedsheet':       'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=260&fit=crop',
  'Pillow':         'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=260&fit=crop',
  'Chair':          'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=260&fit=crop',
  'Almirah':        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=260&fit=crop',
  'Kettle':         'https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=400&h=260&fit=crop',
  'Table':          'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=260&fit=crop',
  'T.V':            'https://images.unsplash.com/photo-1593359677879-a4bb92f4834f?w=400&h=260&fit=crop',
  'Uniform':        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=260&fit=crop',
  'ID Card':        'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400&h=260&fit=crop',
  'Apron':          'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=260&fit=crop',
  'Gloves':         'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=260&fit=crop',
  'Mop':            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=260&fit=crop',
  'Broom':          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=260&fit=crop',
  'Bucket':         'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=260&fit=crop',
  'Cleaning Spray': 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=400&h=260&fit=crop',
  'Safety Shoes':   'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=260&fit=crop',
  'Dustpan':        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=260&fit=crop',
  'Pillow Cover':   'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=260&fit=crop',
  'Fridge':         'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=260&fit=crop',
  'Washing Machine':'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=400&h=260&fit=crop',
  'Wi-fi':          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=260&fit=crop',
};
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=260&fit=crop';
const NEW_ITEM_IMG = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop';

// ─── EXCHANGE HISTORY (rich dummy data) ──────────────────────────
const EXCHANGE_HISTORY = {
  // User items
  'Pillow':       [
    { date: '8 Jul 2025',  note: 'Pillow exchanged — old one torn',          newItemImg: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=400&fit=crop' },
    { date: '2 Mar 2025',  note: 'Pillow exchanged — permanent stain',        newItemImg: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=400&fit=crop' },
    { date: '5 Oct 2024',  note: 'Pillow exchanged — foam degraded',          newItemImg: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=400&fit=crop' },
  ],
  'Bedsheet':     [
    { date: '5 Jul 2025',  note: 'Bedsheet exchanged — requested by tenant',  newItemImg: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop' },
    { date: '10 Jan 2025', note: 'Bedsheet exchanged — wear & tear',           newItemImg: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop' },
    { date: '20 Aug 2024', note: 'Bedsheet exchanged — color faded',           newItemImg: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop' },
  ],
  'Pillow Cover': [
    { date: '8 Jul 2025',  note: 'Pillow cover exchanged — faded color',      newItemImg: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=400&fit=crop' },
    { date: '15 Apr 2025', note: 'Pillow cover exchanged — torn at seam',     newItemImg: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=400&fit=crop' },
  ],
  'Mattress':     [
    { date: '1 Jun 2025',  note: 'Mattress exchanged — sagging issue',        newItemImg: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop' },
  ],
  'Chair':        [
    { date: '12 May 2025', note: 'Chair exchanged — broken leg',               newItemImg: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&h=400&fit=crop' },
  ],
  // Staff items
  'Uniform':      [
    { date: '15 Jun 2025', note: 'Uniform replaced — annual refresh',         newItemImg: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=400&fit=crop' },
    { date: '10 Jan 2025', note: 'Uniform replaced — damaged in wash',        newItemImg: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=400&fit=crop' },
  ],
  'Gloves':       [
    { date: '20 Jun 2025', note: 'Gloves replaced — worn out',                newItemImg: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=400&fit=crop' },
    { date: '5 Apr 2025',  note: 'Gloves replaced — torn',                    newItemImg: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=400&fit=crop' },
    { date: '8 Jan 2025',  note: 'Gloves replaced — lost one pair',           newItemImg: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=400&fit=crop' },
  ],
  'Apron':        [
    { date: '1 Jul 2025',  note: 'Apron replaced — heavy stain',              newItemImg: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop' },
    { date: '3 Mar 2025',  note: 'Apron replaced — torn strap',               newItemImg: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop' },
  ],
  'Mop':          [
    { date: '25 Jun 2025', note: 'Mop replaced — mop head worn out',          newItemImg: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop' },
  ],
  'Bucket':       [
    { date: '10 Jun 2025', note: 'Bucket replaced — crack at base',           newItemImg: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&h=400&fit=crop' },
  ],
};

// ─── SHARED STYLES & COMPONENTS ──────────────────────────────────
const BASE = { maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 };
const cyan = '#0891b2';

function Header({ title, onBack, action }) {
  return (
    <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cyan, display: 'flex' }}>
        <span className="material-symbols-outlined">arrow_back</span>
      </button>
      <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>{title}</p>
      {action || <div style={{ width: 32 }} />}
    </div>
  );
}

function SaveBtn() {
  return <button style={{ background: cyan, color: 'white', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>;
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: cyan, fontSize: 20, pointerEvents: 'none' }}>search</span>
      <input value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: `1.5px solid ${cyan}`, borderRadius: 12, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );
}

function Fab({ onClick }) {
  return (
    <button onClick={onClick} style={{ position: 'fixed', right: 24, bottom: 32, width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${cyan},#0e7490)`, color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(8,145,178,0.4)', cursor: 'pointer', zIndex: 40 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 24 }}>add</span>
    </button>
  );
}

// Simple item row — qty is typeable input, always clickable
function ItemRow({ item, idx, total, onQtyChange, onClick, onRemove }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: idx < total - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: cyan }}>{item.icon}</span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{item.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="number" min="0" value={item.qty}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); onQtyChange && onQtyChange(parseInt(e.target.value) || 0); }}
          style={{ width: 52, padding: '6px 8px', border: `1.5px solid ${cyan}`, borderRadius: 8, fontSize: 15, fontWeight: 700, color: '#0f172a', textAlign: 'center', outline: 'none', fontFamily: 'inherit', background: 'white' }}
        />
        {onRemove ? (
          <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ background: 'none', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
          </button>
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>chevron_right</span>
        )}
      </div>
    </div>
  );
}

// ─── EXCHANGE PHOTO VIEWER ────────────────────────────────────────
function ExchangePhotoView({ exchange, itemName, onBack }) {
  return (
    <div style={BASE}>
      <Header title="New Item Photo" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <img src={exchange.newItemImg || NEW_ITEM_IMG} alt={itemName}
            style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = DEFAULT_IMG; }} />
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: '0 0 8px' }}>Exchange Details</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ca8a04' }}>swap_horiz</span>
            <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{exchange.note}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>calendar_today</span>
            <span style={{ fontSize: 13, color: '#64748b' }}>{exchange.date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ITEM DETAIL VIEW ─────────────────────────────────────────────
function ItemDetailView({ item, person, onBack, onQtyChange }) {
  const [showAddExchange, setShowAddExchange] = useState(false);
  const [exchangeNote, setExchangeNote] = useState('');
  const [extraExchanges, setExtraExchanges] = useState([]);
  const [viewingExchange, setViewingExchange] = useState(null);

  const baseHistory = EXCHANGE_HISTORY[item.name] || [];
  const allHistory = [...extraExchanges, ...baseHistory];

  if (viewingExchange) return <ExchangePhotoView exchange={viewingExchange} itemName={item.name} onBack={() => setViewingExchange(null)} />;

  const handleAddExchange = () => {
    if (!exchangeNote.trim()) return;
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    setExtraExchanges(prev => [{ date: today, note: exchangeNote.trim(), newItemImg: ITEM_IMAGES[item.name] || DEFAULT_IMG }, ...prev]);
    setExchangeNote('');
    setShowAddExchange(false);
  };

  return (
    <div style={BASE}>
      <Header title={item.name} onBack={onBack} action={<SaveBtn />} />
      <div style={{ padding: 16 }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          <img src={ITEM_IMAGES[item.name] || DEFAULT_IMG} alt={item.name}
            style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = DEFAULT_IMG; }} />
          <div style={{ background: 'white', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: cyan }}>{item.icon}</span>
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>{item.name}</p>
                {person && <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Allotted to {person.name}</p>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px' }}>Quantity</p>
              <input type="number" min="0" value={item.qty}
                onChange={e => onQtyChange(parseInt(e.target.value) || 0)}
                style={{ width: 64, padding: '8px 10px', border: `1.5px solid ${cyan}`, borderRadius: 10, fontSize: 16, fontWeight: 700, color: '#0f172a', textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
            </div>
          </div>
        </div>

        {/* Exchange count badge */}
        {allHistory.length > 0 && (
          <div style={{ background: '#fef9c3', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, border: '1px solid #fde68a' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ca8a04' }}>swap_horiz</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Total Exchanges: {allHistory.length}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>Exchange History</p>
          <button onClick={() => setShowAddExchange(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ecfeff', border: `1.5px solid #a5f3fc`, borderRadius: 8, padding: '6px 12px', color: cyan, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Add
          </button>
        </div>

        {showAddExchange && (
          <div style={{ background: 'white', borderRadius: 14, border: `1.5px solid ${cyan}`, padding: 16, marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 8px' }}>Log Exchange</p>
            <textarea value={exchangeNote} onChange={e => setExchangeNote(e.target.value)}
              placeholder={`Reason for ${item.name} exchange...`} rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box', color: '#0f172a' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setShowAddExchange(false)} style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleAddExchange} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, background: cyan, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Save Exchange</button>
            </div>
          </div>
        )}

        {allHistory.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '28px 16px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', display: 'block', marginBottom: 8 }}>history</span>
            <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>No exchanges yet</p>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {allHistory.map((ex, i) => (
              <div key={i} onClick={() => setViewingExchange(ex)}
                style={{ display: 'flex', gap: 12, padding: '13px 16px', borderBottom: i < allHistory.length - 1 ? '1px solid #f1f5f9' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ca8a04' }}>swap_horiz</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 3px' }}>{ex.note}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#94a3b8' }}>calendar_today</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{ex.date}</span>
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>photo_camera</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EXCHANGE SUMMARY VIEW ────────────────────────────────────────
function ExchangeSummaryView({ items, onBack, onSelectItem }) {
  const itemsWithExchanges = items.filter(it => (EXCHANGE_HISTORY[it.name] || []).length > 0);
  return (
    <div style={BASE}>
      <Header title="Exchange Summary" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <div style={{ background: '#fef9c3', borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: '1px solid #fde68a' }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#92400e', margin: '0 0 4px' }}>Total Items Exchanged</p>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 28, fontWeight: 800, color: '#ca8a04', margin: 0 }}>
            {itemsWithExchanges.reduce((s, it) => s + (EXCHANGE_HISTORY[it.name] || []).length, 0)}
          </p>
        </div>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {itemsWithExchanges.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>swap_horiz</span>
              No exchanges recorded yet
            </div>
          ) : (
            itemsWithExchanges.map((it, i) => {
              const count = (EXCHANGE_HISTORY[it.name] || []).length;
              return (
                <div key={it.name} onClick={() => onSelectItem(it)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < itemsWithExchanges.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: cyan }}>{it.icon}</span>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{it.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#fef9c3', color: '#ca8a04', fontWeight: 700, fontSize: 13, padding: '4px 12px', borderRadius: 20 }}>{count}x</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>chevron_right</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PERSON CARD ──────────────────────────────────────────────────
function PersonCard({ person, isUser }) {
  const rows = isUser
    ? [{ icon: 'phone', text: person.phone }, { icon: 'bed', text: person.bed }, { icon: 'meeting_room', text: person.room }]
    : [{ icon: 'badge', text: person.empId }, { icon: 'person', text: person.role }, { icon: 'phone', text: person.phone }];
  return (
    <div style={{ background: cyan, borderRadius: 16, padding: '16px', display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
      <img src={person.img} alt={person.name} style={{ width: 70, height: 70, borderRadius: 12, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: 16, color: 'white', margin: '0 0 4px' }}>{person.name}</p>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{r.icon}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── USER ALLOTTED VIEW ───────────────────────────────────────────
function UserAllottedView({ person, onBack }) {
  const [items, setItems] = useState(USER_ALLOTTED.map(i => ({ ...i })));
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [showSummary, setShowSummary] = useState(null); // null | 'summary' | itemObj
  const updateQty = (idx, val) => setItems(p => p.map((it, i) => i === idx ? { ...it, qty: Math.max(0, val) } : it));

  // Exchange summary flow
  if (showSummary === 'summary') {
    return <ExchangeSummaryView items={items} onBack={() => setShowSummary(null)}
      onSelectItem={it => { setShowSummary(it); }} />;
  }
  if (showSummary && showSummary.name) {
    const idx = items.findIndex(i => i.name === showSummary.name);
    return <ItemDetailView item={items[idx]} person={person} onBack={() => setShowSummary('summary')}
      onQtyChange={val => updateQty(idx, val)} />;
  }

  if (selectedIdx !== null) {
    return <ItemDetailView item={items[selectedIdx]} person={person} onBack={() => setSelectedIdx(null)}
      onQtyChange={val => updateQty(selectedIdx, val)} />;
  }

  const exchangeTotal = items.reduce((s, it) => s + (EXCHANGE_HISTORY[it.name] || []).length, 0);

  return (
    <div style={BASE}>
      <Header title="Allotted Inventory" onBack={onBack} action={<SaveBtn />} />
      <div style={{ padding: 16 }}>
        <PersonCard person={person} isUser />

        {/* Exchange Summary Button */}
        <button onClick={() => setShowSummary('summary')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fef9c3', border: '1.5px solid #fde68a', borderRadius: 14, padding: '14px 16px', marginBottom: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ color: '#ca8a04', fontSize: 22 }}>swap_horiz</span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#92400e', margin: 0 }}>View Exchange Summary</p>
              <p style={{ fontSize: 12, color: '#a16207', margin: 0 }}>Total {exchangeTotal} exchanges recorded</p>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: '#ca8a04', fontSize: 20 }}>chevron_right</span>
        </button>

        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {items.map((item, idx) => (
            <ItemRow key={idx} item={item} idx={idx} total={items.length}
              onQtyChange={val => updateQty(idx, val)}
              onRemove={() => setItems(p => p.filter((_, i) => i !== idx))}
              onClick={() => setSelectedIdx(idx)} />
          ))}
        </div>
        <Fab onClick={() => {
          const name = window.prompt("Enter new item name:");
          if (name && name.trim()) {
            setItems(p => [...p, { id: 'new_'+Date.now(), name: name.trim(), qty: 1, icon: 'inventory_2', cat: 'Others' }]);
          }
        }} />
      </div>
    </div>
  );
}

// ─── STAFF ALLOTTED VIEW ──────────────────────────────────────────
function StaffAllottedView({ person, onBack }) {
  const [items, setItems] = useState(STAFF_ALLOTTED.map(i => ({ ...i })));
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [showSummary, setShowSummary] = useState(null);
  const updateQty = (idx, val) => setItems(p => p.map((it, i) => i === idx ? { ...it, qty: Math.max(0, val) } : it));

  if (showSummary === 'summary') {
    return <ExchangeSummaryView items={items} onBack={() => setShowSummary(null)}
      onSelectItem={it => setShowSummary(it)} />;
  }
  if (showSummary && showSummary.name) {
    const idx = items.findIndex(i => i.name === showSummary.name);
    return <ItemDetailView item={items[idx]} person={person} onBack={() => setShowSummary('summary')}
      onQtyChange={val => updateQty(idx, val)} />;
  }
  if (selectedIdx !== null) {
    return <ItemDetailView item={items[selectedIdx]} person={person} onBack={() => setSelectedIdx(null)}
      onQtyChange={val => updateQty(selectedIdx, val)} />;
  }

  const exchangeTotal = items.reduce((s, it) => s + (EXCHANGE_HISTORY[it.name] || []).length, 0);

  return (
    <div style={BASE}>
      <Header title="Allotted Inventory" onBack={onBack} action={<SaveBtn />} />
      <div style={{ padding: 16 }}>
        <PersonCard person={person} isUser={false} />

        <button onClick={() => setShowSummary('summary')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fef9c3', border: '1.5px solid #fde68a', borderRadius: 14, padding: '14px 16px', marginBottom: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ color: '#ca8a04', fontSize: 22 }}>swap_horiz</span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#92400e', margin: 0 }}>View Exchange Summary</p>
              <p style={{ fontSize: 12, color: '#a16207', margin: 0 }}>Total {exchangeTotal} exchanges recorded</p>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: '#ca8a04', fontSize: 20 }}>chevron_right</span>
        </button>

        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {items.map((item, idx) => (
            <ItemRow key={idx} item={item} idx={idx} total={items.length}
              onQtyChange={val => updateQty(idx, val)}
              onRemove={() => setItems(p => p.filter((_, i) => i !== idx))}
              onClick={() => setSelectedIdx(idx)} />
          ))}
        </div>
        <Fab onClick={() => {
          const name = window.prompt("Enter new item name:");
          if (name && name.trim()) {
            setItems(p => [...p, { id: 'new_'+Date.now(), name: name.trim(), qty: 1, icon: 'inventory_2', cat: 'Others' }]);
          }
        }} />
      </div>
    </div>
  );
}

// ─── USER INVENTORY ───────────────────────────────────────────────
function UserInventoryView({ onBack }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  if (selected) return <UserAllottedView person={selected} onBack={() => setSelected(null)} />;
  const filtered = USERS.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={BASE}>
      <Header title="User List" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search User" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(user => (
            <div key={user.id} onClick={() => setSelected(user)} style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: 12, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <img src={user.img} alt={user.name} style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: '0 0 6px' }}>{user.name}</p>
                {[{ icon: 'phone', text: user.phone }, { icon: 'bed', text: user.bed }, { icon: 'meeting_room', text: user.room }].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>{r.icon}</span>
                    <span style={{ fontSize: 13, color: '#475569' }}>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STAFF INVENTORY ──────────────────────────────────────────────
function StaffInventoryView({ onBack }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  if (selected) return <StaffAllottedView person={selected} onBack={() => setSelected(null)} />;
  const filtered = STAFF.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={BASE}>
      <Header title="Staff List" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Staff" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(staff => (
            <div key={staff.id} onClick={() => setSelected(staff)} style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: 12, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <img src={staff.img} alt={staff.name} style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: '0 0 6px' }}>{staff.name}</p>
                {[{ icon: 'badge', text: staff.empId }, { icon: 'person', text: staff.role }, { icon: 'phone', text: staff.phone }].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>{r.icon}</span>
                    <span style={{ fontSize: 13, color: '#475569' }}>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PG INVENTORY — item → location → photo ───────────────────────
function PGLocationPhotoView({ location, itemName, onBack }) {
  return (
    <div style={BASE}>
      <Header title={location.place} onBack={onBack} />
      <div style={{ padding: 16 }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <img src={location.img} alt={location.place} style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = DEFAULT_IMG; }} />
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 12px' }}>Location Details</p>
          {[{ icon: 'apartment', label: 'Location', val: location.place }, { icon: 'inventory_2', label: 'Item', val: itemName }, { icon: 'numbers', label: 'Quantity Here', val: `${location.qty} units` }].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: cyan }}>{r.icon}</span>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{r.label}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>{r.val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PGItemAvailabilityView({ item, onBack }) {
  const [selectedLoc, setSelectedLoc] = useState(null);
  if (selectedLoc) return <PGLocationPhotoView location={selectedLoc} itemName={item.name} onBack={() => setSelectedLoc(null)} />;
  const locs = item.locations || [];
  return (
    <div style={BASE}>
      <Header title={`${item.name} — Availability`} onBack={onBack} />
      <div style={{ padding: 16 }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
          <img src={ITEM_IMAGES[item.name] || DEFAULT_IMG} alt={item.name}
            style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = DEFAULT_IMG; }} />
          <div style={{ background: 'white', padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>{item.name}</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{locs.length} location{locs.length !== 1 ? 's' : ''}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Total</p>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, color: cyan, margin: 0 }}>{item.qty}</p>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Tap a location to see photo</p>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {locs.map((loc, i) => (
            <div key={i} onClick={() => setSelectedLoc(loc)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < locs.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: cyan }}>location_on</span>
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', margin: 0 }}>{loc.place}</p>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{loc.qty} units available</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>photo_camera</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>chevron_right</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PGInventoryView({ onBack }) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState(PG_ITEMS.map(i => ({ ...i })));
  const [selectedItem, setSelectedItem] = useState(null);
  const updateQty = (idx, val) => setItems(p => p.map((it, i) => i === idx ? { ...it, qty: Math.max(0, val) } : it));
  if (selectedItem !== null) return <PGItemAvailabilityView item={items[selectedItem]} onBack={() => setSelectedItem(null)} />;
  const filtered = items.map((it, origIdx) => ({ ...it, origIdx })).filter(it => it.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={BASE}>
      <Header title="PG Inventory" onBack={onBack} action={<SaveBtn />} />
      <div style={{ padding: 16 }}>
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Product" />
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {filtered.map((item, i) => (
            <ItemRow key={item.name} item={item} idx={i} total={filtered.length}
              onQtyChange={val => updateQty(item.origIdx, val)}
              onClick={() => setSelectedItem(item.origIdx)} />
          ))}
        </div>
        <Fab />
      </div>
    </div>
  );
}

// ─── ROOM INVENTORY — full interactive ───────────────────────────
function RoomUserDetailView({ user, onBack }) {
  return <UserAllottedView person={user} onBack={onBack} />;
}

function RoomItemDetailView({ item, roomNo, onBack }) {
  const [viewingExchange, setViewingExchange] = useState(null);
  const [localQty, setLocalQty] = useState(item.qty);
  const history = EXCHANGE_HISTORY[item.name] || [];
  if (viewingExchange) return <ExchangePhotoView exchange={viewingExchange} itemName={item.name} onBack={() => setViewingExchange(null)} />;
  return (
    <div style={BASE}>
      <Header title={item.name} onBack={onBack} />
      <div style={{ padding: 16 }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
          <img src={ITEM_IMAGES[item.name] || DEFAULT_IMG} alt={item.name}
            style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = DEFAULT_IMG; }} />
          <div style={{ background: 'white', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>{item.name}</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>in {roomNo}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px' }}>Qty</p>
              <input type="number" min="0" value={localQty} onChange={e => setLocalQty(parseInt(e.target.value) || 0)}
                style={{ width: 56, padding: '6px 8px', border: `1.5px solid ${cyan}`, borderRadius: 8, fontSize: 15, fontWeight: 700, color: '#0f172a', textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
            </div>
          </div>
        </div>
        {history.length > 0 && (
          <>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 10 }}>Exchange History ({history.length})</p>
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {history.map((ex, i) => (
                <div key={i} onClick={() => setViewingExchange(ex)}
                  style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: i < history.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', alignItems: 'center' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ca8a04' }}>swap_horiz</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{ex.note}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{ex.date}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>photo_camera</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RoomDetailView({ room, onBack }) {
  const [items, setItems] = useState(ROOM_ITEMS.map(i => ({ ...i })));
  const [tab, setTab] = useState('residents'); // 'residents' | 'items'
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const residents = USERS.filter(u => room.residentIds.includes(u.id));
  const updateQty = (idx, val) => setItems(p => p.map((it, i) => i === idx ? { ...it, qty: Math.max(0, val) } : it));

  if (selectedUser) return <RoomUserDetailView user={selectedUser} onBack={() => setSelectedUser(null)} />;
  if (selectedItem !== null) return <RoomItemDetailView item={items[selectedItem]} roomNo={room.roomNo} onBack={() => setSelectedItem(null)} />;

  return (
    <div style={BASE}>
      <Header title={room.roomNo} onBack={onBack} action={<SaveBtn />} />
      <div style={{ padding: 16 }}>
        {/* Room hero */}
        <div style={{ background: cyan, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
          <img src={room.img} alt={room.name} style={{ width: '100%', height: 130, objectFit: 'cover', opacity: 0.8 }} />
          <div style={{ padding: '12px 16px' }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: 'white', margin: '0 0 2px' }}>{room.name}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '0 0 2px' }}>{room.type}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>people</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{residents.length} resident{residents.length !== 1 ? 's' : ''} · {room.beds} bed{room.beds !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[{ id: 'residents', label: 'Residents', icon: 'people' }, { id: 'items', label: 'Room Items', icon: 'inventory_2' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '12px', borderRadius: 12, border: tab === t.id ? `2px solid ${cyan}` : '1.5px solid #e2e8f0', background: tab === t.id ? '#ecfeff' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: tab === t.id ? cyan : '#94a3b8' }}>{t.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: tab === t.id ? cyan : '#64748b' }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Residents tab */}
        {tab === 'residents' && (
          residents.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>person_off</span>
              No residents assigned
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {residents.map(user => (
                <div key={user.id} onClick={() => setSelectedUser(user)}
                  style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: 12, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <img src={user.img} alt={user.name} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 4px' }}>{user.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: cyan }}>bed</span>
                      <span style={{ fontSize: 12, color: '#475569' }}>{user.bed}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: cyan }}>phone</span>
                      <span style={{ fontSize: 12, color: '#475569' }}>{user.phone}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>chevron_right</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Items tab — synced from ROOM_ITEMS */}
        {tab === 'items' && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {items.map((item, idx) => (
              <ItemRow key={item.name} item={item} idx={idx} total={items.length}
                onQtyChange={val => updateQty(idx, val)}
                onClick={() => setSelectedItem(idx)} />
            ))}
          </div>
        )}
        <Fab />
      </div>
    </div>
  );
}

function RoomInventoryView({ onBack }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  if (selected) return <RoomDetailView room={selected} onBack={() => setSelected(null)} />;
  const filtered = ROOMS.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.type.toLowerCase().includes(search.toLowerCase()) || r.roomNo.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={BASE}>
      <Header title="Room List" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Room" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(room => {
            const residents = USERS.filter(u => room.residentIds.includes(u.id));
            return (
              <div key={room.id} onClick={() => setSelected(room)} style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <img src={room.img} alt={room.name} style={{ width: 100, height: 90, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ padding: '12px 14px', flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 2px' }}>{room.name}</p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px' }}>{room.type}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: cyan }}>meeting_room</span>
                    <span style={{ fontSize: 12, color: '#475569' }}>{room.roomNo}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: cyan }}>people</span>
                    <span style={{ fontSize: 12, color: '#475569' }}>{residents.length} resident{residents.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── KITCHEN INVENTORY — no +/- buttons ──────────────────────────
function KitchenInventoryView({ onBack }) {
  const [tab, setTab] = useState('hard');
  const [hardItems, setHardItems] = useState(KITCHEN_HARD.map(i => ({ ...i })));
  const [softItems, setSoftItems] = useState(KITCHEN_SOFT.map(i => ({ ...i })));
  const [fromDate, setFromDate] = useState('2025-01-01');
  const [toDate, setToDate] = useState('2025-02-02');
  const updateHardQty = (idx, val) => setHardItems(p => p.map((it, i) => i === idx ? { ...it, qty: Math.max(0, val) } : it));
  const updateSoftQty = (idx, val) => setSoftItems(p => p.map((it, i) => i === idx ? { ...it, qty: Math.max(0, val) } : it));
  const updateSoftUnit = (idx, unit) => setSoftItems(p => p.map((it, i) => i === idx ? { ...it, unit } : it));
  const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div style={BASE}>
      <Header title="Kitchen Inventory" onBack={onBack} action={<SaveBtn />} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[{ id: 'hard', label: 'Hard Inventory', icon: 'kitchen' }, { id: 'soft', label: 'Soft Inventory', icon: 'inventory_2' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '14px 8px', borderRadius: 12, cursor: 'pointer', border: tab === t.id ? `2px solid ${cyan}` : '1.5px solid #e2e8f0', background: tab === t.id ? '#ecfeff' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: tab === t.id ? cyan : '#94a3b8' }}>{t.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: tab === t.id ? cyan : '#64748b' }}>{t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'soft' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[{ label: 'From', val: fromDate, set: setFromDate }, { label: 'To', val: toDate, set: setToDate }].map(f => (
              <label key={f.label} style={{ display: 'block', background: 'white', border: `1.5px solid ${cyan}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 18 }}>calendar_month</span>
                  <div>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{f.label} Date</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: cyan, margin: 0 }}>{fmtDate(f.val)}</p>
                  </div>
                </div>
                <input type="date" value={f.val} onChange={e => f.set(e.target.value)} style={{ display: 'none' }} />
              </label>
            ))}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {tab === 'hard' ? hardItems.map((item, idx) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: idx < hardItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', flex: 1 }}>{item.name}</span>
              <input type="number" min="0" value={item.qty}
                onChange={e => updateHardQty(idx, parseInt(e.target.value) || 0)}
                style={{ width: 56, padding: '7px 8px', border: `1.5px solid ${cyan}`, borderRadius: 8, fontSize: 15, fontWeight: 700, color: '#0f172a', textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
            </div>
          )) : softItems.map((item, idx) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: idx < softItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', flex: 1 }}>{item.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min="0" value={item.qty}
                  onChange={e => updateSoftQty(idx, parseInt(e.target.value) || 0)}
                  style={{ width: 56, padding: '7px 8px', border: `1.5px solid ${cyan}`, borderRadius: 8, fontSize: 15, fontWeight: 700, color: '#0f172a', textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
                <select value={item.unit} onChange={e => updateSoftUnit(idx, e.target.value)}
                  style={{ border: `1.5px solid ${cyan}`, borderRadius: 8, padding: '7px 4px', fontSize: 13, fontWeight: 600, color: cyan, background: 'white', outline: 'none', cursor: 'pointer' }}>
                  <option>Kg</option><option>Gm</option><option>L</option><option>Ml</option><option>Pcs</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        <Fab />
      </div>
    </div>
  );
}

// ─── KITCHEN REPORT ───────────────────────────────────────────────
function KitchenReportView({ onBack }) {
  const [fromDate, setFromDate] = useState('2025-02-02');
  const [toDate, setToDate] = useState('2025-02-02');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (selectedMonth) return (
    <div style={BASE}>
      <Header title="Kitchen Report" onBack={() => setSelectedMonth(null)} />
      <div style={{ padding: 16 }}>
        <div style={{ background: 'white', border: `1.5px solid ${cyan}`, borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: cyan, margin: 0 }}>Total Amount</p>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>₹ 2,000,000</p>
        </div>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {KITCHEN_TRANSACTIONS.map((tx, i) => (
            <div key={i} style={{ padding: '13px 16px', borderBottom: i < KITCHEN_TRANSACTIONS.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: cyan }}>kitchen</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{tx.item}</span>
                </div>
                <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 14, color: '#0f172a' }}>₹ {tx.amount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 26 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#94a3b8' }}>calendar_month</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{tx.date}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{tx.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={BASE}>
      <Header title="Kitchen Report" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Filter By</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[{ label: 'From Date', val: fromDate, set: setFromDate }, { label: 'To Date', val: toDate, set: setToDate }].map(f => (
            <label key={f.label} style={{ display: 'block', background: 'white', border: `1.5px solid ${cyan}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 18 }}>calendar_month</span>
                <div>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{f.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{fmtDate(f.val)}</p>
                </div>
              </div>
              <input type="date" value={f.val} onChange={e => f.set(e.target.value)} style={{ display: 'none' }} />
            </label>
          ))}
        </div>
        <div style={{ background: 'white', border: `1.5px solid ${cyan}`, borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: cyan, margin: 0 }}>Total Amount</p>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>₹ 2,000,000</p>
        </div>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {KITCHEN_REPORT_MONTHLY.map((row, i) => (
            <div key={i} onClick={() => setSelectedMonth(row)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < KITCHEN_REPORT_MONTHLY.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 18 }}>calendar_month</span>
                <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{row.month}</span>
              </div>
              <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a' }}>₹ {row.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN INVENTORY PAGE ──────────────────────────────────────────
export default function Inventory() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState(null);
  const [search, setSearch] = useState('');
  const handleModule = id => { setActiveModule(id); setSearch(''); };

  if (activeModule === 'user-inventory')    return <UserInventoryView    onBack={() => setActiveModule(null)} />;
  if (activeModule === 'staff-inventory')   return <StaffInventoryView   onBack={() => setActiveModule(null)} />;
  if (activeModule === 'pg-inventory')      return <PGInventoryView      onBack={() => setActiveModule(null)} />;
  if (activeModule === 'room-inventory')    return <RoomInventoryView    onBack={() => setActiveModule(null)} />;
  if (activeModule === 'kitchen-inventory') return <KitchenInventoryView onBack={() => setActiveModule(null)} />;
  if (activeModule === 'kitchen-report')    return <KitchenReportView    onBack={() => setActiveModule(null)} />;

  const visible = MODULES.filter(m => m.label.toLowerCase().replace('\n', ' ').includes(search.toLowerCase()));

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif" }}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: cyan }}>
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 20, color: cyan, margin: 0, flex: 1, textAlign: 'center' }}>Inventory</p>
        <div style={{ width: 24 }} />
      </div>
      <div style={{ padding: '20px 16px' }}>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: cyan, fontSize: 20, pointerEvents: 'none' }}>search</span>
          <input placeholder="Search inventories..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: `1.5px solid ${cyan}`, borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {visible.map(mod => (
            <button key={mod.id} onClick={() => handleModule(mod.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 8px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'all 0.2s' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: mod.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>{mod.icon}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{mod.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

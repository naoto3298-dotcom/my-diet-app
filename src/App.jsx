import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Utensils, Coffee, Sun, Moon, PieChart, Sparkles, Bookmark, AlertCircle, ChevronLeft, ChevronRight, Calendar, ChevronDown, ChevronUp, X, Clock, Search, Zap, Globe, Settings, Database, User, Activity, Save, Target, Folder, ArrowRightLeft } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyDEnJ6_gPN1gjPYpEL5-Ozp0y_1KGL8quQ",
  authDomain: "mydietapp-98c1e.firebaseapp.com",
  projectId: "mydietapp-98c1e",
  storageBucket: "mydietapp-98c1e.firebasestorage.app",
  messagingSenderId: "1038596253907",
  appId: "1:1038596253907:web:000ab1fef5b256fd704c26",
  measurementId: "G-4FL1HCL9L8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'mydietapp-98c1e';

// デフォルトの目標値
const DEFAULT_TARGETS = {
  calories: 2000,
  protein: 100, // g
  fat: 44,      // g
  carbs: 300,   // g
};

const PFC_TARGET_RATIOS = { p: 20, f: 20, c: 60 };

const GOAL_PRESETS = {
  health: { label: '健康維持', p: 20, f: 20, c: 60, description: 'バランスの良い標準的な食事' },
  diet: { label: 'ダイエット', p: 30, f: 20, c: 50, description: '糖質・脂質を抑え、タンパク質を多めに' },
  muscle: { label: '筋肉を付ける', p: 30, f: 25, c: 45, description: '筋肉の合成とエネルギー補給を重視' },
  custom: { label: 'カスタム', p: 0, f: 0, c: 0, description: '自分でPFC割合を自由に設定' },
};

const ACTIVITY_LEVELS = {
  none: { label: '考慮しない (基礎的な活動のみ)', multiplier: 1.2, description: '運動はほぼしない。デスクワークや家事などが中心。' },
  light: { label: '軽い運動', multiplier: 1.375, description: '週に1〜2回の軽い運動、または立ち仕事が多い。' },
  moderate: { label: '中程度の運動', multiplier: 1.55, description: '週に3〜5回の運動や筋トレ。' },
  active: { label: '激しい運動', multiplier: 1.725, description: '週に6〜7回の激しい運動やスポーツ。' },
  veryActive: { label: '非常に激しい運動', multiplier: 1.9, description: '毎日の過酷な運動、アスリートや肉体労働。' },
};

// --- 性別に応じた微量栄養素の設定 ---
const getMicronutrientsConfig = (gender = 'male') => ({
  saturatedFat: { label: '飽和脂肪酸', unit: 'g', recommended: null, upperLimit: gender === 'male' ? 15.5 : 12.5, maxDisplay: 20 },
  n3Fat: { label: 'n-3脂肪酸', unit: 'g', recommended: gender === 'male' ? 2.0 : 1.6, upperLimit: null, maxDisplay: 5 },
  n6Fat: { label: 'n-6脂肪酸', unit: 'g', recommended: gender === 'male' ? 10 : 8, upperLimit: null, maxDisplay: 20 },
  cholesterol: { label: 'コレステロール', unit: 'mg', recommended: null, upperLimit: 200, maxDisplay: 300 },
  fiber: { label: '食物繊維', unit: 'g', recommended: gender === 'male' ? 21 : 18, upperLimit: null, maxDisplay: 30 },
  salt: { label: '塩分', unit: 'g', recommended: null, upperLimit: gender === 'male' ? 7.5 : 6.5, maxDisplay: 10 },
  potassium: { label: 'カリウム', unit: 'mg', recommended: gender === 'male' ? 2500 : 2000, upperLimit: null, maxDisplay: 4000 },
  magnesium: { label: 'マグネシウム', unit: 'mg', recommended: gender === 'male' ? 340 : 290, upperLimit: null, maxDisplay: 500 },
  phosphorus: { label: 'リン', unit: 'mg', recommended: gender === 'male' ? 1000 : 800, upperLimit: 3000, maxDisplay: 4000 },
  zinc: { label: '亜鉛', unit: 'mg', recommended: gender === 'male' ? 11 : 8, upperLimit: gender === 'male' ? 40 : 35, maxDisplay: 50 },
  copper: { label: '銅', unit: 'mg', recommended: gender === 'male' ? 0.9 : 0.8, upperLimit: 7, maxDisplay: 10 },
  molybdenum: { label: 'モリブデン', unit: 'µg', recommended: gender === 'male' ? 30 : 25, upperLimit: gender === 'male' ? 600 : 500, maxDisplay: 800 },
  vitaminD: { label: 'ビタミンD', unit: 'µg', recommended: 8.5, upperLimit: 100, maxDisplay: 120 },
  vitaminE: { label: 'ビタミンE', unit: 'mg', recommended: gender === 'male' ? 6.0 : 5.0, upperLimit: gender === 'male' ? 900 : 700, maxDisplay: 1000 },
  vitaminB1: { label: 'ビタミンB1', unit: 'mg', recommended: gender === 'male' ? 1.4 : 1.1, upperLimit: null, maxDisplay: 3 },
  vitaminB2: { label: 'ビタミンB2', unit: 'mg', recommended: gender === 'male' ? 1.6 : 1.2, upperLimit: null, maxDisplay: 3 },
  vitaminB6: { label: 'ビタミンB6', unit: 'mg', recommended: gender === 'male' ? 1.4 : 1.1, upperLimit: gender === 'male' ? 55 : 45, maxDisplay: 70 },
  vitaminB12: { label: 'ビタミンB12', unit: 'µg', recommended: 2.4, upperLimit: null, maxDisplay: 5 },
  folate: { label: '葉酸', unit: 'µg', recommended: 240, upperLimit: 1000, maxDisplay: 1200 },
  vitaminC: { label: 'ビタミンC', unit: 'mg', recommended: 100, upperLimit: 1000, maxDisplay: 1200 },
  calcium: { label: 'カルシウム', unit: 'mg', recommended: gender === 'male' ? 800 : 650, upperLimit: 2500, maxDisplay: 3000 },
  iron: { label: '鉄分', unit: 'mg', recommended: gender === 'male' ? 7.5 : 10.5, upperLimit: gender === 'male' ? 50 : 40, maxDisplay: 60 },
});

const MEAL_TYPES = {
  breakfast: { label: '朝食', icon: Sun, color: 'text-orange-500', bgColor: 'bg-orange-100' },
  lunch: { label: '昼食', icon: Utensils, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
  dinner: { label: '夕食', icon: Moon, color: 'text-indigo-500', bgColor: 'bg-indigo-100' },
  snack: { label: '間食', icon: Coffee, color: 'text-pink-500', bgColor: 'bg-pink-100' },
};

// --- アプリ内蔵の主要な食事データベース（詳細な微量栄養素を完全追加済） ---
const LOCAL_FOOD_DATABASE = [
  // === 主食 ===
  { name: '白米 (150g・茶碗1杯)', aliases: ['ごはん', 'ご飯', 'こめ', 'お米', 'ライス'], calories: 234, protein: 3.8, fat: 0.5, carbs: 55.7, micros: { fiber: 0.5, salt: 0, zinc: 0.9, iron: 0.2, potassium: 44, magnesium: 11, phosphorus: 51, copper: 0.15, vitaminB1: 0.03, vitaminB2: 0.02, vitaminB6: 0.06 } },
  { name: 'ごはん180g', aliases: ['白米', 'ご飯', 'こめ', 'お米', 'ライス'], calories: 281, protein: 4.5, fat: 0.5, carbs: 66.8, micros: { fiber: 0.5, salt: 0, zinc: 1.1, iron: 0.2, potassium: 52, magnesium: 13, phosphorus: 61, copper: 0.18, vitaminB1: 0.04, vitaminB2: 0.02, vitaminB6: 0.07 } },
  { name: '玄米 (150g・茶碗1杯)', aliases: ['げんまい'], calories: 228, protein: 4.2, fat: 1.5, carbs: 51.3, micros: { fiber: 2.1, salt: 0, iron: 0.6, magnesium: 74, potassium: 140, phosphorus: 130, zinc: 1.2, copper: 0.2, vitaminB1: 0.24, vitaminB6: 0.21, folate: 15 } },
  { name: '赤飯180g', aliases: ['せきはん'], calories: 340, protein: 7.5, fat: 1.5, carbs: 72.0, micros: { fiber: 2.5, salt: 1.0, iron: 0.9, potassium: 160, magnesium: 30, phosphorus: 110, zinc: 1.3, copper: 0.2, vitaminB1: 0.08, vitaminB2: 0.04 } },
  { name: '炊き込みご飯 (1杯 150g)', aliases: ['たきこみごはん', 'かやくごはん', '五目ご飯'], calories: 250, protein: 5.0, fat: 2.0, carbs: 50.0, micros: { fiber: 1.2, salt: 1.5, iron: 0.5, potassium: 120, magnesium: 18, phosphorus: 70, zinc: 1.0, vitaminB1: 0.05, vitaminB2: 0.03 } },
  { name: 'おかゆ (全粥 1杯 250g)', aliases: ['お粥'], calories: 178, protein: 2.3, fat: 0.3, carbs: 39.5, micros: { fiber: 0.3, salt: 0.5, potassium: 30, magnesium: 8, phosphorus: 35, zinc: 0.6, iron: 0.1, vitaminB1: 0.02 } },
  { name: 'おにぎり 鮭 (1個 約100g)', aliases: ['おむすび', 'しゃけ'], calories: 170, protein: 4.5, fat: 1.0, carbs: 35.0, micros: { fiber: 0.3, salt: 1.2, iron: 0.2, potassium: 50, magnesium: 10, zinc: 0.7, vitaminD: 1.5, vitaminB12: 0.8, n3Fat: 0.2 } },
  { name: 'おにぎり ツナマヨ (1個 約100g)', aliases: ['おむすび'], calories: 210, protein: 4.0, fat: 6.5, carbs: 34.0, micros: { fiber: 0.3, salt: 1.0, iron: 0.3, potassium: 60, magnesium: 12, zinc: 0.6, saturatedFat: 1.0, cholesterol: 10, vitaminE: 0.5 } },
  { name: 'おにぎり 昆布 (1個 約100g)', aliases: ['おむすび', 'こんぶ'], calories: 165, protein: 3.0, fat: 0.5, carbs: 36.0, micros: { fiber: 0.8, salt: 1.1, iron: 0.3, potassium: 70, calcium: 15, magnesium: 12, zinc: 0.6 } },
  { name: 'おにぎり 梅 (1個 約100g)', aliases: ['おむすび', '梅干し'], calories: 160, protein: 2.5, fat: 0.3, carbs: 36.0, micros: { fiber: 0.4, salt: 1.5, iron: 0.2, potassium: 45, magnesium: 9, zinc: 0.6 } },
  { name: '食パン (6枚切り・1枚)', aliases: ['パン', 'ぱん'], calories: 149, protein: 5.3, fat: 2.5, carbs: 28.0, micros: { fiber: 1.4, salt: 0.8, calcium: 15, iron: 0.4, potassium: 55, magnesium: 12, phosphorus: 45, zinc: 0.5, copper: 0.08, vitaminB1: 0.05, vitaminB2: 0.03 } },
  { name: '食パン (8枚切り・1枚)', aliases: ['パン', 'ぱん'], calories: 124, protein: 4.4, fat: 2.1, carbs: 23.3, micros: { fiber: 1.2, salt: 0.6, calcium: 12, iron: 0.3, potassium: 46, magnesium: 10, phosphorus: 37, zinc: 0.4, vitaminB1: 0.04 } },
  { name: 'ピザトースト (1枚)', aliases: [], calories: 250, protein: 9.0, fat: 10.0, carbs: 30.0, micros: { fiber: 2.0, salt: 1.5, calcium: 100, iron: 0.6, potassium: 200, magnesium: 20, phosphorus: 120, zinc: 1.0, cholesterol: 15, saturatedFat: 4.5, vitaminC: 5, vitaminA: 50 } },
  { name: 'クロワッサン (1個 40g)', aliases: ['パン', 'ぱん'], calories: 179, protein: 3.2, fat: 10.7, carbs: 17.5, micros: { fiber: 0.6, salt: 0.4, calcium: 11, iron: 0.2, potassium: 35, magnesium: 7, phosphorus: 35, zinc: 0.3, saturatedFat: 6.0, cholesterol: 18, vitaminE: 0.5 } },
  { name: 'バターロール (1個 30g)', aliases: ['パン', 'ロールパン'], calories: 95, protein: 2.8, fat: 2.7, carbs: 15.0, micros: { fiber: 0.5, salt: 0.3, calcium: 10, iron: 0.2, potassium: 30, magnesium: 6, phosphorus: 25, zinc: 0.2, cholesterol: 8, saturatedFat: 1.2 } },
  { name: 'フランスパン (1切れ 30g)', aliases: ['バゲット'], calories: 84, protein: 2.8, fat: 0.4, carbs: 17.3, micros: { fiber: 0.8, salt: 0.4, calcium: 5, iron: 0.3, potassium: 30, magnesium: 8, phosphorus: 28, zinc: 0.3 } },
  { name: 'ベーグル (1個 90g)', aliases: ['パン'], calories: 240, protein: 8.5, fat: 1.0, carbs: 48.0, micros: { fiber: 1.5, salt: 1.0, calcium: 15, iron: 0.8, potassium: 85, magnesium: 22, phosphorus: 80, zinc: 0.8, copper: 0.15 } },
  { name: 'うどん (ゆで 1玉 200g)', aliases: [], calories: 210, protein: 5.2, fat: 0.8, carbs: 43.2, micros: { fiber: 1.0, salt: 0.6, calcium: 10, iron: 0.4, potassium: 30, magnesium: 14, phosphorus: 34, zinc: 0.4, copper: 0.08, vitaminB1: 0.04 } },
  { name: 'そば (ゆで 1玉 150g)', aliases: ['蕎麦'], calories: 198, protein: 7.2, fat: 1.5, carbs: 39.0, micros: { fiber: 2.3, salt: 0, calcium: 15, iron: 1.2, potassium: 51, magnesium: 41, phosphorus: 110, zinc: 0.8, copper: 0.15, vitaminB1: 0.12, vitaminB6: 0.06 } },
  { name: 'ざるそば (1人前)', aliases: ['蕎麦', 'ざる蕎麦'], calories: 280, protein: 10.0, fat: 1.5, carbs: 55.0, micros: { fiber: 3.0, salt: 1.5, calcium: 20, iron: 1.5, potassium: 120, magnesium: 50, phosphorus: 140, zinc: 1.0, copper: 0.2, vitaminB1: 0.15 } },
  { name: 'そうめん (乾麺 1束 50g)', aliases: ['素麺'], calories: 178, protein: 4.8, fat: 0.6, carbs: 36.6, micros: { fiber: 0.9, salt: 2.8, calcium: 8, iron: 0.4, potassium: 45, magnesium: 11, phosphorus: 30, zinc: 0.3 } },
  { name: 'パスタ / スパゲッティ (乾麺 100g)', aliases: ['スパゲティ', 'スパゲッティー'], calories: 378, protein: 13.0, fat: 2.0, carbs: 73.0, micros: { fiber: 5.4, salt: 0, calcium: 18, iron: 1.4, potassium: 180, magnesium: 43, phosphorus: 150, zinc: 1.5, copper: 0.3, vitaminB1: 0.15, vitaminB2: 0.06, vitaminB6: 0.1 } },
  { name: 'ナポリタンスパゲッティ (1人前)', aliases: ['パスタ', 'スパゲティ'], calories: 600, protein: 15.0, fat: 20.0, carbs: 85.0, micros: { fiber: 6.0, salt: 3.5, calcium: 40, iron: 2.0, potassium: 450, magnesium: 55, phosphorus: 180, zinc: 2.0, vitaminC: 15, cholesterol: 15, saturatedFat: 5.5, vitaminE: 2.0 } },
  { name: 'ミートスパゲッティ (1人前)', aliases: ['ミートソース', 'パスタ', 'スパゲティ'], calories: 650, protein: 20.0, fat: 22.0, carbs: 85.0, micros: { fiber: 6.5, salt: 3.5, calcium: 50, iron: 3.5, potassium: 500, magnesium: 60, phosphorus: 220, zinc: 3.5, vitaminC: 10, cholesterol: 40, saturatedFat: 7.0, vitaminB12: 0.8 } },
  { name: '中華麺 / ラーメン (生 1玉 120g)', aliases: ['らーめん'], calories: 337, protein: 10.3, fat: 1.9, carbs: 67.2, micros: { fiber: 1.8, salt: 0.2, calcium: 16, iron: 0.7, potassium: 84, magnesium: 22, phosphorus: 88, zinc: 0.7, vitaminB1: 0.08, vitaminB2: 0.05 } },
  { name: '焼きそば (1人前)', aliases: ['やきそば'], calories: 500, protein: 15.0, fat: 18.0, carbs: 65.0, micros: { fiber: 4.0, salt: 3.5, calcium: 35, iron: 1.5, potassium: 300, magnesium: 35, phosphorus: 120, zinc: 1.5, vitaminC: 10, cholesterol: 10, saturatedFat: 3.5 } },
  { name: 'オートミール (1食分 30g)', aliases: [], calories: 114, protein: 4.1, fat: 1.7, carbs: 20.7, micros: { fiber: 2.8, salt: 0, calcium: 14, iron: 1.2, potassium: 80, magnesium: 30, phosphorus: 110, zinc: 0.6, copper: 0.1, vitaminB1: 0.06 } },
  { name: 'グラノーラ (1食分 50g)', aliases: ['シリアル'], calories: 220, protein: 4.0, fat: 7.5, carbs: 35.0, micros: { fiber: 4.5, salt: 0.3, calcium: 20, iron: 2.0, potassium: 120, magnesium: 40, phosphorus: 130, zinc: 0.8, vitaminE: 1.5, vitaminB1: 0.3, vitaminB6: 0.3, folate: 40 } },
  { name: 'コーンフレーク (1食分 40g)', aliases: ['シリアル'], calories: 152, protein: 2.6, fat: 0.4, carbs: 34.5, micros: { fiber: 1.0, salt: 0.5, calcium: 2, iron: 1.5, potassium: 40, magnesium: 6, phosphorus: 20, zinc: 0.2, vitaminB1: 0.3, vitaminB2: 0.3, vitaminC: 15, folate: 30 } },
  { name: '餅 / もち (1個 50g)', aliases: ['お餅', 'おもち'], calories: 112, protein: 2.1, fat: 0.4, carbs: 25.2, micros: { fiber: 0.4, salt: 0, calcium: 3, iron: 0.2, potassium: 22, magnesium: 5, phosphorus: 24, zinc: 0.5, copper: 0.08, vitaminB1: 0.02 } },

  // === 肉類・加工肉 ===
  { name: '鶏むね肉 皮なし (生 100g)', aliases: ['鶏むね', '鶏胸', '鳥胸', '鳥むね', 'とりむね', 'むね肉', '胸肉'], calories: 108, protein: 22.3, fat: 1.5, carbs: 0, micros: { cholesterol: 77, salt: 0.1, potassium: 350, magnesium: 27, phosphorus: 200, zinc: 0.7, iron: 0.3, copper: 0.04, vitaminB1: 0.08, vitaminB2: 0.1, vitaminB6: 0.6, saturatedFat: 0.4, n6Fat: 0.4 } },
  { name: '鶏むね肉（蒸し）100g', aliases: ['鶏むね', '鶏胸', '鳥胸', '鳥むね', 'とりむね', 'むね肉', '胸肉', '蒸し鶏', '蒸しどり'], calories: 105, protein: 23.0, fat: 1.0, carbs: 0.1, micros: { cholesterol: 75, salt: 0.2, potassium: 340, magnesium: 25, phosphorus: 190, zinc: 0.7, iron: 0.3, copper: 0.04, vitaminB1: 0.07, vitaminB2: 0.1, vitaminB6: 0.5, saturatedFat: 0.3, n6Fat: 0.3 } },
  { name: 'サラダチキン (1パック 約110g)', aliases: ['サラチキ'], calories: 110, protein: 24.0, fat: 1.5, carbs: 0.5, micros: { cholesterol: 70, salt: 1.2, potassium: 300, magnesium: 22, phosphorus: 180, zinc: 0.6, iron: 0.3, copper: 0.04, vitaminB1: 0.06, vitaminB2: 0.09, vitaminB6: 0.5, saturatedFat: 0.3 } },
  { name: '唐揚げ1個', aliases: ['からあげ', 'から揚げ', 'ザンギ'], calories: 80, protein: 4.0, fat: 6.0, carbs: 3.0, micros: { cholesterol: 15, salt: 0.3, potassium: 45, magnesium: 5, phosphorus: 30, zinc: 0.2, iron: 0.1, copper: 0.02, vitaminB1: 0.02, vitaminB2: 0.03, vitaminB6: 0.08, saturatedFat: 1.2, vitaminE: 0.4 } },
  { name: '鶏もも肉 皮なし (生 100g)', aliases: ['鶏もも', '鶏腿', '鳥腿', '鳥もも', 'とりもも', 'もも肉', '腿肉'], calories: 116, protein: 18.8, fat: 3.9, carbs: 0, micros: { cholesterol: 81, salt: 0.1, potassium: 300, magnesium: 21, phosphorus: 160, zinc: 1.6, iron: 0.6, copper: 0.06, vitaminB1: 0.09, vitaminB2: 0.15, vitaminB6: 0.3, saturatedFat: 1.1, n6Fat: 1.2 } },
  { name: '鶏手羽先 (生 100g)', aliases: ['手羽先'], calories: 211, protein: 17.4, fat: 15.2, carbs: 0, micros: { cholesterol: 95, salt: 0.1, potassium: 210, magnesium: 15, phosphorus: 130, zinc: 1.2, iron: 0.5, copper: 0.05, vitaminB1: 0.05, vitaminB2: 0.11, vitaminB6: 0.2, saturatedFat: 4.5, n6Fat: 3.5 } },
  { name: '鶏手羽元 (生 100g)', aliases: ['手羽元'], calories: 197, protein: 18.2, fat: 12.8, carbs: 0, micros: { cholesterol: 90, salt: 0.1, potassium: 230, magnesium: 17, phosphorus: 140, zinc: 1.3, iron: 0.5, copper: 0.05, vitaminB1: 0.06, vitaminB2: 0.12, vitaminB6: 0.25, saturatedFat: 3.8, n6Fat: 3.0 } },
  { name: '鶏ささみ (生 100g)', aliases: ['ささみ', 'ササミ'], calories: 105, protein: 23.0, fat: 0.8, carbs: 0, micros: { cholesterol: 67, salt: 0.1, potassium: 360, magnesium: 29, phosphorus: 220, zinc: 0.6, iron: 0.2, copper: 0.04, vitaminB1: 0.08, vitaminB2: 0.11, vitaminB6: 0.6, saturatedFat: 0.2, n6Fat: 0.2 } },
  { name: '鶏レバー (生 100g)', aliases: ['レバー'], calories: 111, protein: 18.9, fat: 3.1, carbs: 0.6, micros: { iron: 9.0, cholesterol: 370, salt: 0.1, potassium: 250, magnesium: 19, phosphorus: 300, zinc: 3.3, copper: 0.3, vitaminA: 14000, vitaminB1: 0.38, vitaminB2: 1.8, vitaminB6: 0.65, vitaminB12: 44.0, folate: 1300, vitaminC: 20 } },
  { name: '鶏砂肝 (生 100g)', aliases: ['すなぎも', '砂ずり'], calories: 94, protein: 18.3, fat: 1.8, carbs: 0, micros: { iron: 2.5, cholesterol: 200, salt: 0.1, potassium: 260, magnesium: 19, phosphorus: 160, zinc: 2.8, copper: 0.1, vitaminB1: 0.04, vitaminB2: 0.25, vitaminB6: 0.15, vitaminB12: 1.2 } },
  { name: '豚ロース 赤身 (生 100g)', aliases: ['豚肉', 'ぶたにく'], calories: 140, protein: 22.7, fat: 4.8, carbs: 0.2, micros: { vitaminB1: 0.9, zinc: 1.8, iron: 0.7, cholesterol: 61, salt: 0.1, potassium: 380, magnesium: 26, phosphorus: 210, copper: 0.08, vitaminB2: 0.2, vitaminB6: 0.3, saturatedFat: 1.6, n6Fat: 0.8 } },
  { name: '豚バラ肉 (生 100g)', aliases: ['豚肉', 'ぶたにく', '豚ばら'], calories: 386, protein: 14.2, fat: 34.6, carbs: 0.1, micros: { vitaminB1: 0.5, zinc: 1.3, iron: 0.5, cholesterol: 70, salt: 0.1, potassium: 230, magnesium: 14, phosphorus: 120, copper: 0.05, vitaminB2: 0.12, vitaminB6: 0.2, saturatedFat: 12.8, n6Fat: 4.5 } },
  { name: '豚ヒレ (生 100g)', aliases: ['豚肉', 'ひれ肉'], calories: 115, protein: 22.8, fat: 1.9, carbs: 0.2, micros: { vitaminB1: 1.0, zinc: 2.2, iron: 0.8, cholesterol: 61, salt: 0.1, potassium: 410, magnesium: 28, phosphorus: 230, copper: 0.09, vitaminB2: 0.22, vitaminB6: 0.4, saturatedFat: 0.6, n6Fat: 0.3 } },
  { name: '豚トロ (生 100g)', aliases: ['とんとろ', '豚肉'], calories: 392, protein: 14.3, fat: 35.4, carbs: 0.1, micros: { vitaminB1: 0.4, zinc: 1.2, iron: 0.4, cholesterol: 75, salt: 0.1, potassium: 200, magnesium: 12, phosphorus: 100, copper: 0.04, vitaminB2: 0.1, vitaminB6: 0.15, saturatedFat: 13.5, n6Fat: 4.8 } },
  { name: 'とんかつ (1枚 約100g)', aliases: ['豚かつ', 'トンカツ'], calories: 340, protein: 15.0, fat: 25.0, carbs: 10.0, micros: { salt: 0.8, cholesterol: 50, iron: 0.6, zinc: 1.2, vitaminB1: 0.5, potassium: 250, magnesium: 18, phosphorus: 140, copper: 0.08, vitaminB2: 0.15, vitaminB6: 0.2, saturatedFat: 6.0, n6Fat: 5.0, vitaminE: 1.5 } },
  { name: '牛もも肉 (生 100g)', aliases: ['牛肉', 'ぎゅうにく'], calories: 182, protein: 21.2, fat: 9.6, carbs: 0.5, micros: { iron: 2.8, zinc: 4.5, cholesterol: 62, salt: 0.1, potassium: 330, magnesium: 22, phosphorus: 190, copper: 0.1, vitaminB1: 0.07, vitaminB2: 0.2, vitaminB6: 0.4, vitaminB12: 1.5, saturatedFat: 3.5, n6Fat: 0.4 } },
  { name: '牛サーロイン (生 100g)', aliases: ['牛肉', 'ぎゅうにく', 'ステーキ'], calories: 298, protein: 17.4, fat: 23.7, carbs: 0.4, micros: { iron: 1.5, zinc: 3.8, cholesterol: 65, salt: 0.1, potassium: 270, magnesium: 18, phosphorus: 150, copper: 0.08, vitaminB1: 0.06, vitaminB2: 0.15, vitaminB6: 0.3, vitaminB12: 1.2, saturatedFat: 9.8, n6Fat: 0.8 } },
  { name: '牛タン (生 100g)', aliases: ['牛肉', 'ぎゅうたん'], calories: 269, protein: 15.2, fat: 21.7, carbs: 0.1, micros: { iron: 2.0, zinc: 3.0, cholesterol: 95, salt: 0.2, potassium: 200, magnesium: 15, phosphorus: 130, copper: 0.12, vitaminB1: 0.1, vitaminB2: 0.3, vitaminB6: 0.25, vitaminB12: 2.5, saturatedFat: 8.5, n6Fat: 1.0 } },
  { name: '牛ハラミ (生 100g)', aliases: ['牛肉', 'はらみ'], calories: 344, protein: 14.8, fat: 30.0, carbs: 0.2, micros: { iron: 2.2, zinc: 4.2, cholesterol: 70, salt: 0.2, potassium: 250, magnesium: 18, phosphorus: 160, copper: 0.1, vitaminB1: 0.08, vitaminB2: 0.2, vitaminB6: 0.3, vitaminB12: 1.8, saturatedFat: 11.5, n6Fat: 1.2 } },
  { name: 'ハンバーグ (1個 約100g)', aliases: [], calories: 220, protein: 13.0, fat: 14.0, carbs: 9.0, micros: { salt: 1.0, cholesterol: 45, iron: 1.2, zinc: 2.0, potassium: 220, magnesium: 15, phosphorus: 120, copper: 0.08, vitaminB1: 0.15, vitaminB2: 0.15, vitaminB6: 0.2, vitaminB12: 0.8, saturatedFat: 5.0, fiber: 0.5 } },
  { name: 'ウインナー (1本 15g)', aliases: ['ソーセージ', 'ウィンナー'], calories: 48, protein: 2.0, fat: 4.1, carbs: 0.5, micros: { salt: 0.3, cholesterol: 10, iron: 0.1, zinc: 0.3, potassium: 30, magnesium: 2, phosphorus: 20, copper: 0.01, vitaminB1: 0.05, vitaminB2: 0.02, vitaminB12: 0.1, saturatedFat: 1.5, n6Fat: 0.4 } },
  { name: 'ロースハム (1枚 15g)', aliases: ['ハム'], calories: 17, protein: 2.5, fat: 0.5, carbs: 0.3, micros: { salt: 0.4, cholesterol: 7, iron: 0.1, zinc: 0.2, potassium: 40, magnesium: 3, phosphorus: 25, copper: 0.01, vitaminB1: 0.1, vitaminB2: 0.03, vitaminB12: 0.1, saturatedFat: 0.2, n6Fat: 0.1 } },
  { name: '生ハム (1枚 10g)', aliases: ['ハム'], calories: 25, protein: 2.4, fat: 1.5, carbs: 0.1, micros: { salt: 0.6, cholesterol: 8, iron: 0.1, zinc: 0.3, potassium: 35, magnesium: 2, phosphorus: 20, copper: 0.01, vitaminB1: 0.08, vitaminB2: 0.02, vitaminB12: 0.1, saturatedFat: 0.5, n6Fat: 0.2 } },

  // === 魚介類 ===
  { name: '焼きしゃけ100g', aliases: ['焼き鮭', '焼きさけ', 'やきしゃけ', 'シャケ', 'サーモン'], calories: 140, protein: 22.5, fat: 4.8, carbs: 0.1, micros: { vitaminD: 30, salt: 1.5, iron: 0.4, zinc: 0.5, potassium: 360, magnesium: 28, phosphorus: 240, copper: 0.06, vitaminB1: 0.15, vitaminB2: 0.12, vitaminB6: 0.6, vitaminB12: 5.0, folate: 10, n3Fat: 1.2, cholesterol: 60, saturatedFat: 0.8 } },
  { name: '鮭 / さけ (生 100g)', aliases: ['しゃけ', 'シャケ', 'サケ', 'サーモン'], calories: 133, protein: 22.3, fat: 4.5, carbs: 0.1, micros: { vitaminD: 32, n3Fat: 1.2, salt: 0.1, iron: 0.4, zinc: 0.4, potassium: 350, magnesium: 27, phosphorus: 230, copper: 0.05, vitaminB1: 0.16, vitaminB2: 0.11, vitaminB6: 0.55, vitaminB12: 5.5, folate: 11, cholesterol: 59, saturatedFat: 0.8 } },
  { name: 'さば (生 100g)', aliases: ['サバ', '鯖'], calories: 247, protein: 20.6, fat: 16.8, carbs: 0.3, micros: { vitaminD: 5.1, n3Fat: 2.1, salt: 0.1, iron: 1.2, zinc: 1.1, potassium: 310, magnesium: 31, phosphorus: 210, copper: 0.1, vitaminB1: 0.15, vitaminB2: 0.3, vitaminB6: 0.6, vitaminB12: 12.0, folate: 15, cholesterol: 65, saturatedFat: 3.8 } },
  { name: 'ブリ (生 100g)', aliases: ['鰤', 'はまち', 'ハマチ'], calories: 257, protein: 21.4, fat: 17.6, carbs: 0.3, micros: { n3Fat: 1.8, vitaminD: 8.0, salt: 0.1, iron: 1.3, zinc: 0.8, potassium: 350, magnesium: 33, phosphorus: 200, copper: 0.1, vitaminB1: 0.2, vitaminB2: 0.35, vitaminB6: 0.4, vitaminB12: 3.5, folate: 10, cholesterol: 62, saturatedFat: 4.2 } },
  { name: 'カツオ (生 100g)', aliases: ['かつお', '鰹'], calories: 114, protein: 25.8, fat: 0.5, carbs: 0.1, micros: { iron: 1.9, vitaminD: 4.0, salt: 0.1, zinc: 0.8, potassium: 430, magnesium: 36, phosphorus: 250, copper: 0.1, vitaminB1: 0.1, vitaminB2: 0.15, vitaminB6: 0.8, vitaminB12: 8.0, folate: 10, cholesterol: 46, saturatedFat: 0.2, n3Fat: 0.3 } },
  { name: 'タイ (生 100g)', aliases: ['鯛', 'たい'], calories: 129, protein: 20.6, fat: 5.8, carbs: 0.1, micros: { vitaminD: 1.5, salt: 0.1, iron: 0.3, zinc: 0.4, potassium: 420, magnesium: 30, phosphorus: 210, copper: 0.05, vitaminB1: 0.1, vitaminB2: 0.1, vitaminB6: 0.3, vitaminB12: 1.5, folate: 5, cholesterol: 53, saturatedFat: 1.3, n3Fat: 0.6 } },
  { name: 'ヒラメ (生 100g)', aliases: ['ひらめ', '平目'], calories: 103, protein: 20.0, fat: 2.0, carbs: 0.1, micros: { vitaminD: 2.0, salt: 0.1, iron: 0.2, zinc: 0.4, potassium: 400, magnesium: 35, phosphorus: 200, copper: 0.05, vitaminB1: 0.1, vitaminB2: 0.1, vitaminB6: 0.3, vitaminB12: 1.0, folate: 5, cholesterol: 55, saturatedFat: 0.4, n3Fat: 0.3 } },
  { name: 'アジの開き (1尾 80g)', aliases: ['あじ', '鯵'], calories: 120, protein: 16.0, fat: 5.5, carbs: 0.1, micros: { salt: 1.2, vitaminD: 4.0, iron: 0.8, zinc: 0.7, potassium: 250, magnesium: 25, phosphorus: 180, copper: 0.08, vitaminB1: 0.1, vitaminB2: 0.15, vitaminB6: 0.25, vitaminB12: 4.0, folate: 10, cholesterol: 50, saturatedFat: 1.2, n3Fat: 0.6 } },
  { name: 'ししゃも (3尾 45g)', aliases: ['シシャモ', '柳葉魚'], calories: 80, protein: 7.0, fat: 5.5, carbs: 0.2, micros: { calcium: 150, salt: 0.7, vitaminD: 2.5, iron: 0.8, zinc: 0.6, potassium: 120, magnesium: 15, phosphorus: 130, copper: 0.05, vitaminB1: 0.05, vitaminB2: 0.15, vitaminB6: 0.1, vitaminB12: 3.0, folate: 10, cholesterol: 80, saturatedFat: 1.2, n3Fat: 0.5 } },
  { name: 'タラコ (1腹 40g)', aliases: ['たらこ'], calories: 56, protein: 9.6, fat: 1.9, carbs: 0.2, micros: { salt: 1.8, cholesterol: 140, iron: 0.4, zinc: 1.2, potassium: 90, magnesium: 8, phosphorus: 160, copper: 0.1, vitaminB1: 0.2, vitaminB2: 0.3, vitaminB6: 0.1, vitaminB12: 6.0, folate: 35, vitaminD: 0.6, vitaminE: 1.5 } },
  { name: '明太子 (1腹 40g)', aliases: ['めんたいこ'], calories: 50, protein: 8.4, fat: 1.3, carbs: 1.2, micros: { salt: 2.2, cholesterol: 120, iron: 0.3, zinc: 1.0, potassium: 85, magnesium: 7, phosphorus: 140, copper: 0.08, vitaminB1: 0.15, vitaminB2: 0.25, vitaminB6: 0.1, vitaminB12: 5.0, folate: 30, vitaminD: 0.5, vitaminE: 1.2 } },
  { name: 'イクラ (大さじ1 15g)', aliases: ['いくら'], calories: 40, protein: 4.8, fat: 2.4, carbs: 0.1, micros: { cholesterol: 72, salt: 0.3, iron: 0.1, zinc: 0.2, potassium: 35, magnesium: 2, phosphorus: 60, copper: 0.02, vitaminB1: 0.05, vitaminB2: 0.06, vitaminB12: 3.5, folate: 10, vitaminD: 0.8, vitaminE: 0.6 } },
  { name: 'カニ (むき身 50g)', aliases: ['かに', '蟹'], calories: 35, protein: 7.5, fat: 0.2, carbs: 0.1, micros: { zinc: 1.5, iron: 0.2, salt: 0.4, potassium: 150, magnesium: 15, phosphorus: 90, copper: 0.3, vitaminB1: 0.03, vitaminB2: 0.04, vitaminB12: 2.0, folate: 5, cholesterol: 30 } },
  { name: 'タコ (ゆで 50g)', aliases: ['たこ', '蛸'], calories: 38, protein: 8.2, fat: 0.4, carbs: 0.1, micros: { zinc: 0.8, iron: 0.3, salt: 0.3, potassium: 160, magnesium: 25, phosphorus: 90, copper: 0.8, vitaminB1: 0.02, vitaminB2: 0.05, vitaminB12: 1.5, folate: 5, cholesterol: 45, vitaminE: 0.8 } },
  { name: 'カキ (生 50g)', aliases: ['かき', '牡蠣'], calories: 30, protein: 3.3, fat: 0.7, carbs: 2.4, micros: { zinc: 7.0, iron: 1.0, salt: 0.3, potassium: 100, magnesium: 18, phosphorus: 50, copper: 0.4, vitaminB1: 0.04, vitaminB2: 0.07, vitaminB12: 14.0, folate: 20, cholesterol: 25 } },
  { name: 'ホタテ (生 50g)', aliases: ['ほたて', '帆立'], calories: 41, protein: 8.5, fat: 0.5, carbs: 0.8, micros: { zinc: 1.0, iron: 0.1, salt: 0.1, potassium: 160, magnesium: 20, phosphorus: 90, copper: 0.05, vitaminB1: 0.02, vitaminB2: 0.05, vitaminB12: 4.0, folate: 15, cholesterol: 20 } },
  { name: 'ちりめんじゃこ大さじ1 (約5g)', aliases: ['じゃこ', 'しらす'], calories: 10, protein: 2.0, fat: 0.2, carbs: 0.0, micros: { calcium: 26, salt: 0.3, vitaminD: 0.3, iron: 0.1, potassium: 15, magnesium: 3, phosphorus: 30, zinc: 0.1, cholesterol: 15 } },
  { name: 'エビフライ (1尾)', aliases: ['えびフライ', '海老フライ'], calories: 120, protein: 5.0, fat: 7.0, carbs: 8.0, micros: { cholesterol: 60, salt: 0.4, calcium: 15, iron: 0.3, potassium: 60, magnesium: 10, phosphorus: 70, zinc: 0.4, copper: 0.1, vitaminE: 1.2, saturatedFat: 1.2 } },
  { name: 'エビチリ (1人前)', aliases: ['えびチリ', '海老のチリソース'], calories: 250, protein: 14.0, fat: 12.0, carbs: 18.0, micros: { salt: 2.0, cholesterol: 150, calcium: 40, iron: 0.8, potassium: 200, magnesium: 30, phosphorus: 150, zinc: 1.2, copper: 0.3, vitaminC: 5, saturatedFat: 1.5 } },
  { name: 'ツナ缶 水煮 (1缶 70g)', aliases: ['シーチキン'], calories: 50, protein: 11.2, fat: 0.5, carbs: 0.1, micros: { salt: 0.5, iron: 0.6, potassium: 150, magnesium: 15, phosphorus: 120, zinc: 0.4, copper: 0.05, vitaminB1: 0.02, vitaminB2: 0.05, vitaminB12: 1.5, cholesterol: 25, n3Fat: 0.1 } },
  { name: 'かまぼこ (1切れ 15g)', aliases: ['蒲鉾'], calories: 14, protein: 1.8, fat: 0.1, carbs: 1.5, micros: { salt: 0.3, calcium: 2, iron: 0, potassium: 15, magnesium: 2, phosphorus: 15, zinc: 0.1, cholesterol: 5 } },
  { name: 'ちくわ (1本 30g)', aliases: ['竹輪'], calories: 36, protein: 3.7, fat: 0.6, carbs: 4.0, micros: { salt: 0.6, calcium: 5, iron: 0.1, potassium: 35, magnesium: 5, phosphorus: 30, zinc: 0.1, cholesterol: 12 } },

  // === 大豆製品・卵・乳製品 ===
  { name: '卵 (Mサイズ・1個 50g)', aliases: ['たまご', '玉子', 'タマゴ'], calories: 71, protein: 6.1, fat: 5.2, carbs: 0.2, micros: { cholesterol: 210, vitaminD: 0.9, iron: 0.9, salt: 0.1, potassium: 65, calcium: 25, magnesium: 6, phosphorus: 90, zinc: 0.6, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.2, vitaminB6: 0.04, vitaminB12: 0.4, folate: 20, vitaminE: 0.5, saturatedFat: 1.5 } },
  { name: '生卵 (1個 50g)', aliases: ['なまたまご', '生たまご', '生玉子'], calories: 71, protein: 6.1, fat: 5.2, carbs: 0.2, micros: { cholesterol: 210, vitaminD: 0.9, iron: 0.9, salt: 0.1, potassium: 65, calcium: 25, magnesium: 6, phosphorus: 90, zinc: 0.6, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.2, vitaminB6: 0.04, vitaminB12: 0.4, folate: 20, vitaminE: 0.5, saturatedFat: 1.5 } },
  { name: 'ゆで卵 (1個 50g)', aliases: ['ゆでたまご', '茹で卵', '茹で玉子'], calories: 67, protein: 6.5, fat: 4.3, carbs: 0.2, micros: { cholesterol: 210, vitaminD: 0.9, iron: 0.9, salt: 0.1, potassium: 65, calcium: 25, magnesium: 6, phosphorus: 90, zinc: 0.6, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.2, vitaminB6: 0.04, vitaminB12: 0.4, folate: 20, vitaminE: 0.5, saturatedFat: 1.3 } },
  { name: '目玉焼き（醤油） (卵1個分)', aliases: ['めだまやき'], calories: 80, protein: 6.3, fat: 5.5, carbs: 0.5, micros: { cholesterol: 210, salt: 0.5, iron: 0.9, potassium: 70, calcium: 25, magnesium: 6, phosphorus: 95, zinc: 0.6, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.2, vitaminB6: 0.04, vitaminB12: 0.4, folate: 20, vitaminE: 0.6, saturatedFat: 1.6 } },
  { name: '卵焼き (卵1個分)', aliases: ['たまごやき', '玉子焼き', 'タマゴ焼き'], calories: 85, protein: 6.5, fat: 5.5, carbs: 1.0, micros: { cholesterol: 210, salt: 0.4, iron: 0.9, potassium: 70, calcium: 25, magnesium: 6, phosphorus: 95, zinc: 0.6, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.2, vitaminB6: 0.04, vitaminB12: 0.4, folate: 20, vitaminE: 0.7, saturatedFat: 1.6 } },
  { name: 'オムレツ (卵2個分)', aliases: ['たまご'], calories: 200, protein: 13.0, fat: 15.0, carbs: 2.0, micros: { cholesterol: 420, salt: 0.8, iron: 1.8, potassium: 150, calcium: 55, magnesium: 15, phosphorus: 190, zinc: 1.3, copper: 0.07, vitaminB1: 0.07, vitaminB2: 0.4, vitaminB6: 0.1, vitaminB12: 0.8, folate: 40, vitaminE: 1.5, saturatedFat: 5.0 } },
  { name: 'スクランブルエッグ (卵2個)', aliases: ['たまご'], calories: 180, protein: 12.0, fat: 13.0, carbs: 1.5, micros: { cholesterol: 420, salt: 0.8, iron: 1.8, potassium: 150, calcium: 55, magnesium: 15, phosphorus: 190, zinc: 1.3, copper: 0.07, vitaminB1: 0.07, vitaminB2: 0.4, vitaminB6: 0.1, vitaminB12: 0.8, folate: 40, vitaminE: 1.4, saturatedFat: 4.5 } },
  { name: '納豆 (1パック 50g)', aliases: ['なっとう'], calories: 96, protein: 8.3, fat: 4.8, carbs: 6.0, micros: { fiber: 3.4, iron: 1.6, potassium: 330, calcium: 45, salt: 0.6, magnesium: 50, phosphorus: 95, zinc: 0.9, copper: 0.3, vitaminB1: 0.04, vitaminB2: 0.15, vitaminB6: 0.1, folate: 60, vitaminE: 0.3, saturatedFat: 0.7 } },
  { name: '冷ややっこ (1人前 150g)', aliases: ['冷奴', '豆腐', 'とうふ'], calories: 84, protein: 7.5, fat: 4.5, carbs: 2.6, micros: { calcium: 65, iron: 1.2, fiber: 0.5, salt: 0.5, potassium: 220, magnesium: 65, phosphorus: 110, zinc: 0.9, copper: 0.2, vitaminB1: 0.1, vitaminB2: 0.05, vitaminB6: 0.1, folate: 20, saturatedFat: 0.6 } },
  { name: '木綿豆腐 (1/2丁 150g)', aliases: ['とうふ', 'トウフ'], calories: 108, protein: 9.9, fat: 6.3, carbs: 2.4, micros: { calcium: 135, iron: 1.4, fiber: 0.6, salt: 0, potassium: 210, magnesium: 75, phosphorus: 140, zinc: 0.9, copper: 0.2, vitaminB1: 0.1, vitaminB2: 0.05, vitaminB6: 0.1, folate: 15, saturatedFat: 0.9 } },
  { name: '絹ごし豆腐 (1/2丁 150g)', aliases: ['とうふ', 'トウフ'], calories: 84, protein: 7.5, fat: 4.5, carbs: 2.6, micros: { calcium: 65, iron: 1.2, fiber: 0.5, salt: 0, potassium: 220, magnesium: 65, phosphorus: 110, zinc: 0.9, copper: 0.2, vitaminB1: 0.1, vitaminB2: 0.05, vitaminB6: 0.1, folate: 20, saturatedFat: 0.6 } },
  { name: '厚揚げ (1/2枚 75g)', aliases: ['あつあげ', '豆腐'], calories: 113, protein: 8.0, fat: 8.5, carbs: 0.7, micros: { calcium: 180, iron: 1.9, fiber: 0.6, salt: 0, potassium: 105, magnesium: 40, phosphorus: 120, zinc: 0.8, copper: 0.2, vitaminB1: 0.05, vitaminB2: 0.03, folate: 12, saturatedFat: 1.2 } },
  { name: '油揚げ (1枚 30g)', aliases: ['あぶらあげ', '豆腐'], calories: 116, protein: 5.6, fat: 10.3, carbs: 0.2, micros: { calcium: 90, iron: 1.2, fiber: 0.5, salt: 0, potassium: 45, magnesium: 20, phosphorus: 60, zinc: 0.5, copper: 0.1, vitaminB1: 0.02, vitaminB2: 0.01, folate: 6, saturatedFat: 1.5 } },
  { name: '麻婆豆腐 (1人前)', aliases: ['マーボー豆腐'], calories: 350, protein: 15.0, fat: 25.0, carbs: 12.0, micros: { salt: 2.5, fiber: 1.5, calcium: 120, iron: 2.0, potassium: 350, magnesium: 50, phosphorus: 180, zinc: 2.0, copper: 0.3, vitaminB1: 0.2, vitaminB2: 0.15, cholesterol: 25, saturatedFat: 4.5 } },
  { name: '豆乳 調製 (200ml)', aliases: ['とうにゅう'], calories: 128, protein: 6.4, fat: 7.2, carbs: 9.4, micros: { iron: 2.4, calcium: 30, fiber: 0.4, salt: 0.4, potassium: 380, magnesium: 50, phosphorus: 100, zinc: 0.8, copper: 0.2, vitaminB1: 0.06, vitaminB2: 0.04, vitaminB6: 0.12, folate: 56, vitaminE: 1.0, saturatedFat: 1.0 } },
  { name: '豆乳 無調製 (200ml)', aliases: ['とうにゅう'], calories: 92, protein: 7.2, fat: 4.0, carbs: 6.2, micros: { iron: 2.4, calcium: 30, fiber: 0.4, salt: 0, potassium: 380, magnesium: 50, phosphorus: 100, zinc: 0.8, copper: 0.2, vitaminB1: 0.06, vitaminB2: 0.04, vitaminB6: 0.12, folate: 56, vitaminE: 0.4, saturatedFat: 0.6 } },
  { name: '牛乳 (コップ1杯 200ml)', aliases: ['ミルク', 'みるく'], calories: 134, protein: 6.6, fat: 7.6, carbs: 9.6, micros: { calcium: 220, vitaminB2: 0.3, salt: 0.2, potassium: 300, magnesium: 20, phosphorus: 180, zinc: 0.8, copper: 0.02, vitaminB1: 0.08, vitaminB6: 0.06, vitaminB12: 0.6, folate: 10, cholesterol: 24, saturatedFat: 4.6 } },
  { name: 'ヨーグルト 低脂肪 (100g)', aliases: [], calories: 45, protein: 4.3, fat: 1.0, carbs: 5.0, micros: { calcium: 130, salt: 0.1, potassium: 160, magnesium: 12, phosphorus: 100, zinc: 0.4, copper: 0.01, vitaminB1: 0.04, vitaminB2: 0.15, vitaminB12: 0.2, folate: 12, cholesterol: 4, saturatedFat: 0.6 } },
  { name: 'スライスチーズ (1枚 18g)', aliases: ['ちーず'], calories: 61, protein: 4.1, fat: 4.7, carbs: 0.3, micros: { calcium: 113, salt: 0.5, potassium: 12, magnesium: 4, phosphorus: 130, zinc: 0.6, copper: 0.01, vitaminB2: 0.06, vitaminB12: 0.3, cholesterol: 14, saturatedFat: 2.8 } },
  { name: 'カマンベールチーズ (20g)', aliases: ['ちーず'], calories: 62, protein: 3.8, fat: 4.9, carbs: 0.2, micros: { calcium: 92, salt: 0.4, potassium: 15, magnesium: 3, phosphorus: 80, zinc: 0.5, copper: 0.01, vitaminB2: 0.08, vitaminB12: 0.4, cholesterol: 15, saturatedFat: 3.0 } },
  { name: 'グラタン (1人前)', aliases: [], calories: 450, protein: 18.0, fat: 25.0, carbs: 35.0, micros: { calcium: 250, salt: 2.0, fiber: 1.5, iron: 1.0, potassium: 400, magnesium: 30, phosphorus: 280, zinc: 2.0, vitaminB1: 0.15, vitaminB2: 0.3, vitaminB12: 0.8, cholesterol: 40, saturatedFat: 10.0 } },
  { name: 'プロテインパウダー ホエイ (30g)', aliases: ['プロテイン', 'ホエイプロテイン'], calories: 119, protein: 23.0, fat: 1.5, carbs: 2.5, micros: { calcium: 120, salt: 0.2, potassium: 150, magnesium: 15, phosphorus: 80, zinc: 0.5, cholesterol: 10, saturatedFat: 0.8, vitaminB1: 0.5, vitaminB2: 0.5, vitaminB6: 0.5, vitaminC: 20 } },

  // === 野菜・きのこ・海藻・果物 ===
  { name: 'キャベツの千切り60g', aliases: ['きゃべつ'], calories: 14, protein: 0.8, fat: 0.1, carbs: 3.1, micros: { vitaminC: 24, fiber: 1.1, salt: 0, potassium: 120, calcium: 25, magnesium: 8, phosphorus: 16, zinc: 0.1, copper: 0.01, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.06, folate: 47 } },
  { name: 'ブロッコリー 小房1つ (約15g)', aliases: ['ぶろっこりー', 'ブロッコリー1房', 'ブロッコリー'], calories: 5, protein: 0.7, fat: 0.1, carbs: 0.7, micros: { vitaminC: 9, fiber: 0.6, salt: 0, potassium: 27, calcium: 6, magnesium: 3, phosphorus: 10, zinc: 0.1, copper: 0.01, vitaminB1: 0.01, vitaminB2: 0.01, vitaminB6: 0.03, folate: 18 } },
  { name: 'トマト (1個 150g)', aliases: ['とまと'], calories: 29, protein: 1.1, fat: 0.2, carbs: 7.1, micros: { vitaminC: 23, potassium: 320, fiber: 1.5, salt: 0, calcium: 11, magnesium: 14, phosphorus: 36, zinc: 0.2, copper: 0.06, vitaminB1: 0.08, vitaminB2: 0.03, vitaminB6: 0.12, folate: 33, vitaminE: 1.4 } },
  { name: '白菜 (生 100g)', aliases: ['はくさい'], calories: 14, protein: 0.8, fat: 0.1, carbs: 3.2, micros: { fiber: 1.3, vitaminC: 19, potassium: 220, salt: 0, calcium: 43, magnesium: 10, phosphorus: 25, zinc: 0.2, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.03, vitaminB6: 0.08, folate: 61 } },
  { name: 'ネギ (生 100g)', aliases: ['ねぎ', '長葱'], calories: 28, protein: 1.4, fat: 0.1, carbs: 6.1, micros: { fiber: 2.2, vitaminC: 14, potassium: 200, salt: 0, calcium: 36, magnesium: 12, phosphorus: 26, zinc: 0.3, copper: 0.04, vitaminB1: 0.04, vitaminB2: 0.04, vitaminB6: 0.11, folate: 72 } },
  { name: 'ニラ (生 100g)', aliases: ['にら'], calories: 21, protein: 1.7, fat: 0.3, carbs: 3.3, micros: { fiber: 2.7, vitaminC: 19, potassium: 400, salt: 0, calcium: 48, magnesium: 20, phosphorus: 41, zinc: 0.3, copper: 0.05, vitaminB1: 0.06, vitaminB2: 0.13, vitaminB6: 0.16, folate: 100, vitaminE: 2.5 } },
  { name: 'ピーマン (1個 30g)', aliases: ['ぴーまん'], calories: 6, protein: 0.3, fat: 0.1, carbs: 1.5, micros: { vitaminC: 23, fiber: 0.7, potassium: 60, salt: 0, calcium: 3, magnesium: 3, phosphorus: 6, zinc: 0.05, copper: 0.01, vitaminB1: 0.01, vitaminB2: 0.01, vitaminB6: 0.06, folate: 8 } },
  { name: 'ナス (1本 80g)', aliases: ['なす', '茄子'], calories: 18, protein: 0.9, fat: 0.1, carbs: 4.1, micros: { fiber: 1.8, vitaminC: 3, potassium: 180, salt: 0, calcium: 14, magnesium: 12, phosphorus: 22, zinc: 0.1, copper: 0.04, vitaminB1: 0.03, vitaminB2: 0.03, vitaminB6: 0.06, folate: 26 } },
  { name: 'オクラ (ゆで 50g)', aliases: ['おくら'], calories: 15, protein: 1.0, fat: 0.1, carbs: 3.3, micros: { fiber: 2.5, vitaminC: 5, potassium: 130, salt: 0, calcium: 46, magnesium: 26, phosphorus: 28, zinc: 0.3, copper: 0.06, vitaminB1: 0.04, vitaminB2: 0.05, vitaminB6: 0.04, folate: 55 } },
  { name: 'もろきゅう (1本分)', aliases: ['きゅうり', '胡瓜'], calories: 40, protein: 1.5, fat: 0.5, carbs: 7.0, micros: { salt: 1.2, fiber: 1.1, vitaminC: 14, potassium: 200, calcium: 26, magnesium: 15, phosphorus: 34, zinc: 0.2, copper: 0.05, vitaminB1: 0.03, vitaminB2: 0.03, vitaminB6: 0.05, folate: 25 } },
  { name: 'とろろ (50g)', aliases: ['山芋', '長芋', 'やまいも'], calories: 32, protein: 1.0, fat: 0.1, carbs: 7.0, micros: { fiber: 0.5, vitaminC: 3, potassium: 210, salt: 0, calcium: 8, magnesium: 8, phosphorus: 14, zinc: 0.2, copper: 0.04, vitaminB1: 0.05, vitaminB2: 0.01, vitaminB6: 0.05, folate: 10 } },
  { name: '大根おろし (50g)', aliases: ['だいこん'], calories: 9, protein: 0.2, fat: 0.1, carbs: 2.0, micros: { vitaminC: 6, fiber: 0.7, potassium: 110, salt: 0, calcium: 12, magnesium: 5, phosphorus: 9, zinc: 0.1, copper: 0.01, vitaminB1: 0.01, vitaminB2: 0.01, vitaminB6: 0.02, folate: 17 } },
  { name: '枝豆 (さや付き100g)', aliases: ['えだまめ'], calories: 135, protein: 11.7, fat: 6.2, carbs: 8.8, micros: { fiber: 5.0, folate: 260, vitaminC: 27, potassium: 490, salt: 0, calcium: 58, iron: 2.5, magnesium: 70, phosphorus: 160, zinc: 1.4, copper: 0.2, vitaminB1: 0.24, vitaminB2: 0.13, vitaminB6: 0.16 } },
  { name: 'おひたし（ほうれん草） (1小鉢)', aliases: ['ホウレン草', 'ほうれんそう'], calories: 25, protein: 2.0, fat: 0.2, carbs: 3.0, micros: { iron: 0.9, fiber: 2.0, salt: 0.5, vitaminC: 15, potassium: 350, folate: 100, calcium: 40, magnesium: 30, phosphorus: 35, zinc: 0.4, copper: 0.05, vitaminB1: 0.05, vitaminB2: 0.1, vitaminB6: 0.1, vitaminE: 1.5 } },
  { name: 'おひたし（小松菜） (1小鉢)', aliases: ['こまつな'], calories: 20, protein: 1.5, fat: 0.2, carbs: 3.0, micros: { calcium: 80, fiber: 1.5, salt: 0.5, vitaminC: 12, potassium: 250, iron: 1.0, folate: 50, magnesium: 20, phosphorus: 25, zinc: 0.2, copper: 0.03, vitaminB1: 0.04, vitaminB2: 0.08, vitaminB6: 0.08, vitaminE: 0.8 } },
  { name: '切り干し大根 (1小鉢)', aliases: ['きりぼしだいこん'], calories: 40, protein: 1.0, fat: 1.5, carbs: 6.0, micros: { fiber: 2.5, calcium: 30, salt: 0.7, potassium: 150, iron: 0.5, magnesium: 10, phosphorus: 15, zinc: 0.2, copper: 0.02, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.03, folate: 10 } },
  { name: 'きんぴらごぼう (1小鉢)', aliases: ['金平ごぼう', 'ゴボウ'], calories: 65, protein: 1.0, fat: 3.0, carbs: 8.0, micros: { fiber: 2.5, salt: 0.8, potassium: 120, calcium: 20, iron: 0.5, magnesium: 15, phosphorus: 25, zinc: 0.2, copper: 0.04, vitaminB1: 0.03, vitaminB2: 0.02, vitaminB6: 0.05, folate: 15, vitaminE: 0.5 } },
  { name: 'エリンギ (生 50g)', aliases: ['きのこ'], calories: 12, protein: 1.3, fat: 0.2, carbs: 2.6, micros: { fiber: 2.2, potassium: 170, salt: 0, vitaminD: 0.6, calcium: 1, iron: 0.2, magnesium: 7, phosphorus: 32, zinc: 0.3, copper: 0.05, vitaminB1: 0.04, vitaminB2: 0.1, vitaminB6: 0.06, folate: 22 } },
  { name: 'マイタケ (生 50g)', aliases: ['きのこ', '舞茸'], calories: 8, protein: 1.0, fat: 0.2, carbs: 1.5, micros: { fiber: 1.4, potassium: 110, salt: 0, vitaminD: 1.0, calcium: 1, iron: 0.2, magnesium: 6, phosphorus: 25, zinc: 0.3, copper: 0.05, vitaminB1: 0.06, vitaminB2: 0.09, vitaminB6: 0.03, folate: 26 } },
  { name: 'ひじき (煮物 1小鉢)', aliases: ['海藻'], calories: 50, protein: 2.0, fat: 2.0, carbs: 6.0, micros: { fiber: 3.0, iron: 1.5, salt: 0.8, calcium: 60, potassium: 150, magnesium: 25, phosphorus: 15, zinc: 0.2, copper: 0.03, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.02, folate: 5 } },
  { name: 'もずく (酢の物 1パック 60g)', aliases: ['海藻'], calories: 20, protein: 0.3, fat: 0.1, carbs: 4.5, micros: { salt: 0.8, fiber: 0.8, calcium: 15, iron: 0.2, potassium: 10, magnesium: 10, phosphorus: 3, zinc: 0.1, copper: 0.01, vitaminB1: 0.01, vitaminB2: 0.01 } },
  { name: '焼きのり (1枚 3g)', aliases: ['海苔', 'のり'], calories: 6, protein: 1.2, fat: 0.1, carbs: 1.3, micros: { fiber: 1.1, salt: 0.1, calcium: 8, iron: 0.3, folate: 57, potassium: 72, magnesium: 9, phosphorus: 21, zinc: 0.1, copper: 0.01, vitaminB1: 0.02, vitaminB2: 0.07, vitaminB6: 0.02, vitaminB12: 1.7, vitaminC: 6, vitaminE: 0.1 } },
  { name: 'ポテトサラダ (100g)', aliases: ['ポテサラ'], calories: 160, protein: 2.0, fat: 11.0, carbs: 13.0, micros: { vitaminC: 10, salt: 0.8, fiber: 1.5, potassium: 250, cholesterol: 10, saturatedFat: 1.5, calcium: 10, iron: 0.5, magnesium: 15, phosphorus: 30, zinc: 0.3, copper: 0.05, vitaminB1: 0.06, vitaminB2: 0.03, vitaminB6: 0.1, folate: 15, vitaminE: 1.5 } },
  { name: 'フライドポテト (100g)', aliases: ['ポテト'], calories: 237, protein: 2.9, fat: 11.5, carbs: 29.3, micros: { salt: 0.6, fiber: 2.5, potassium: 450, vitaminC: 15, saturatedFat: 1.8, calcium: 10, iron: 0.8, magnesium: 25, phosphorus: 60, zinc: 0.4, copper: 0.1, vitaminB1: 0.1, vitaminB2: 0.03, vitaminB6: 0.2, folate: 20, vitaminE: 2.0 } },
  { name: 'バナナ (1本 100g)', aliases: ['ばなな'], calories: 93, protein: 1.1, fat: 0.2, carbs: 22.5, micros: { potassium: 360, fiber: 1.1, vitaminC: 16, salt: 0, magnesium: 32, calcium: 3, iron: 0.3, phosphorus: 27, zinc: 0.2, copper: 0.09, vitaminB1: 0.05, vitaminB2: 0.04, vitaminB6: 0.38, folate: 26, vitaminE: 0.5 } },
  { name: 'いちご (中5個 75g)', aliases: ['イチゴ', '苺'], calories: 26, protein: 0.7, fat: 0.1, carbs: 6.4, micros: { vitaminC: 47, fiber: 1.1, potassium: 130, salt: 0, folate: 68, calcium: 13, iron: 0.2, magnesium: 10, phosphorus: 13, zinc: 0.1, copper: 0.03, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.03, vitaminE: 0.3 } },
  { name: 'りんご (1個 150g)', aliases: ['リンゴ', '林檎'], calories: 80, protein: 0.3, fat: 0.3, carbs: 21.5, micros: { potassium: 180, fiber: 2.3, vitaminC: 6, salt: 0, calcium: 5, iron: 0.2, magnesium: 8, phosphorus: 17, zinc: 0.1, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.02, vitaminB6: 0.06, folate: 3, vitaminE: 0.3 } },
  { name: 'みかん (1個 100g)', aliases: ['ミカン'], calories: 45, protein: 0.5, fat: 0.1, carbs: 12.0, micros: { vitaminC: 32, fiber: 1.0, potassium: 150, salt: 0, calcium: 21, iron: 0.2, magnesium: 11, phosphorus: 17, zinc: 0.1, copper: 0.03, vitaminB1: 0.06, vitaminB2: 0.03, vitaminB6: 0.06, folate: 22, vitaminE: 0.4 } },

  // === スープ・汁物 ===
  { name: '味噌汁（豆腐）', aliases: ['みそ汁', 'みそしる', 'とうふ'], calories: 50, protein: 3.0, fat: 1.5, carbs: 4.0, micros: { salt: 1.5, calcium: 30, fiber: 0.6, iron: 0.5, potassium: 150, magnesium: 15, phosphorus: 40, zinc: 0.3, copper: 0.05, vitaminB1: 0.03, vitaminB2: 0.03, vitaminB6: 0.03, folate: 10 } },
  { name: '味噌汁（わかめ）', aliases: ['みそ汁', 'みそしる'], calories: 35, protein: 2.2, fat: 0.6, carbs: 4.0, micros: { salt: 1.5, fiber: 0.8, calcium: 20, potassium: 120, iron: 0.4, magnesium: 12, phosphorus: 30, zinc: 0.2, copper: 0.03, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.02, folate: 5 } },
  { name: '味噌汁（きのこ）', aliases: ['みそ汁', 'みそしる'], calories: 40, protein: 2.5, fat: 0.8, carbs: 5.0, micros: { salt: 1.5, fiber: 1.2, potassium: 160, calcium: 15, iron: 0.4, magnesium: 12, phosphorus: 35, zinc: 0.3, copper: 0.04, vitaminB1: 0.03, vitaminB2: 0.05, vitaminB6: 0.03, folate: 10, vitaminD: 0.5 } },
  { name: '味噌汁（キャベツ）', aliases: ['みそ汁', 'みそしる'], calories: 45, protein: 2.3, fat: 0.7, carbs: 6.0, micros: { salt: 1.5, fiber: 0.8, vitaminC: 5, potassium: 140, calcium: 18, iron: 0.3, magnesium: 10, phosphorus: 30, zinc: 0.2, copper: 0.03, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.03, folate: 15 } },
  { name: '味噌汁（白菜）', aliases: ['みそ汁', 'みそしる'], calories: 40, protein: 2.2, fat: 0.6, carbs: 5.0, micros: { salt: 1.5, fiber: 0.6, vitaminC: 3, potassium: 130, calcium: 15, iron: 0.3, magnesium: 10, phosphorus: 30, zinc: 0.2, copper: 0.03, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.03, folate: 10 } },
  { name: '味噌汁（そうめん） (1杯)', aliases: ['みそ汁', 'みそしる', '素麺'], calories: 80, protein: 3.0, fat: 0.5, carbs: 14.0, micros: { salt: 1.8, fiber: 0.5, potassium: 90, calcium: 15, iron: 0.3, magnesium: 10, phosphorus: 30, zinc: 0.2, copper: 0.03, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.02, folate: 5 } },
  { name: '味噌汁（具なし）', aliases: ['みそ汁', 'みそしる'], calories: 30, protein: 2.0, fat: 0.5, carbs: 3.5, micros: { salt: 1.4, fiber: 0.2, potassium: 80, calcium: 10, iron: 0.2, magnesium: 8, phosphorus: 20, zinc: 0.1, copper: 0.02, vitaminB1: 0.01, vitaminB2: 0.01, vitaminB6: 0.01, folate: 2 } },
  { name: '豚汁 (1杯)', aliases: ['とんじる', 'ぶたじる'], calories: 120, protein: 6.0, fat: 7.0, carbs: 7.0, micros: { salt: 2.0, fiber: 1.5, vitaminB1: 0.3, potassium: 250, iron: 0.6, cholesterol: 10, saturatedFat: 2.5, calcium: 25, magnesium: 18, phosphorus: 60, zinc: 0.6, copper: 0.05, vitaminB2: 0.06, vitaminB6: 0.15, vitaminC: 5, folate: 15, vitaminE: 0.5 } },
  { name: 'すまし汁（卵） (1杯)', aliases: ['お吸い物', 'たまご'], calories: 50, protein: 3.5, fat: 2.5, carbs: 2.0, micros: { salt: 1.5, cholesterol: 100, potassium: 80, iron: 0.5, fiber: 0.1, calcium: 15, magnesium: 5, phosphorus: 45, zinc: 0.3, copper: 0.02, vitaminB1: 0.02, vitaminB2: 0.1, vitaminB6: 0.02, vitaminB12: 0.2, folate: 10, vitaminD: 0.4 } },
  { name: 'クノールカップスープ (1杯分)', aliases: ['コーンスープ', 'ポタージュ'], calories: 70, protein: 1.0, fat: 2.5, carbs: 11.0, micros: { salt: 1.0, fiber: 0.5, calcium: 15, potassium: 100, saturatedFat: 1.0, iron: 0.2, magnesium: 5, phosphorus: 20, zinc: 0.1, copper: 0.01, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.02, folate: 5 } },

  // === 調味料・油 ===
  { name: '醤油 (大さじ1 18g)', aliases: ['しょうゆ'], calories: 13, protein: 1.4, fat: 0, carbs: 1.4, micros: { salt: 2.6, potassium: 65, phosphorus: 30, magnesium: 7, calcium: 3, iron: 0.2, zinc: 0.1, copper: 0.02, vitaminB1: 0.01, vitaminB2: 0.01, vitaminB6: 0.01 } },
  { name: '味噌 (大さじ1 18g)', aliases: ['みそ'], calories: 38, protein: 2.2, fat: 1.0, carbs: 5.2, micros: { salt: 2.2, fiber: 0.9, potassium: 75, calcium: 15, magnesium: 12, phosphorus: 34, iron: 0.6, zinc: 0.2, copper: 0.05, vitaminB1: 0.01, vitaminB2: 0.03, vitaminB6: 0.03, folate: 10, vitaminE: 0.1 } },
  { name: '塩 (小さじ1 6g)', aliases: ['しお'], calories: 0, protein: 0, fat: 0, carbs: 0, micros: { salt: 6.0, magnesium: 1, calcium: 1, potassium: 1 } },
  { name: '砂糖 (大さじ1 9g)', aliases: ['さとう'], calories: 35, protein: 0, fat: 0, carbs: 9.0, micros: { salt: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0, iron: 0, zinc: 0, copper: 0 } },
  { name: 'マヨネーズ (大さじ1 15g)', aliases: ['まよねーず'], calories: 105, protein: 0.2, fat: 11.3, carbs: 0.7, micros: { salt: 0.3, cholesterol: 15, saturatedFat: 1.8, potassium: 3, calcium: 2, magnesium: 0, phosphorus: 5, iron: 0.1, zinc: 0.1, copper: 0, vitaminE: 1.5, vitaminK: 2.5 } },
  { name: 'ケチャップ (大さじ1 15g)', aliases: [], calories: 18, protein: 0.2, fat: 0, carbs: 4.1, micros: { salt: 0.5, vitaminC: 1, potassium: 60, fiber: 0.2, calcium: 3, magnesium: 3, phosphorus: 5, iron: 0.1, zinc: 0.1, copper: 0.01, vitaminE: 0.2 } },
  { name: '中濃ソース (大さじ1 18g)', aliases: ['ソース'], calories: 24, protein: 0.2, fat: 0, carbs: 5.4, micros: { salt: 1.0, potassium: 45, fiber: 0.1, calcium: 3, magnesium: 3, phosphorus: 5, iron: 0.1, zinc: 0.1, copper: 0.01, vitaminC: 1 } },
  { name: 'ごまドレッシング (大さじ1 15g)', aliases: ['ドレッシング'], calories: 59, protein: 0.4, fat: 5.2, carbs: 2.4, micros: { salt: 0.5, fiber: 0.2, saturatedFat: 0.8, potassium: 15, calcium: 5, magnesium: 4, phosphorus: 10, iron: 0.1, zinc: 0.1, copper: 0.02, vitaminE: 0.5 } },
  { name: 'ノンオイルドレッシング 和風 (大さじ1 15g)', aliases: ['ドレッシング'], calories: 12, protein: 0.3, fat: 0, carbs: 2.6, micros: { salt: 0.8, fiber: 0.1, potassium: 15, calcium: 2, magnesium: 2, phosphorus: 5, iron: 0.1, zinc: 0.1 } },
  { name: 'サラダ油 (大さじ1 12g)', aliases: ['油', 'あぶら'], calories: 111, protein: 0, fat: 12.0, carbs: 0, micros: { salt: 0, saturatedFat: 1.7, vitaminE: 1.5, n6Fat: 6.0 } },
  { name: 'ごま油 (大さじ1 12g)', aliases: ['油', 'あぶら'], calories: 111, protein: 0, fat: 12.0, carbs: 0, micros: { salt: 0, saturatedFat: 1.8, vitaminE: 0.1, n6Fat: 5.0 } },
  { name: 'オリーブオイル (大さじ1 12g)', aliases: ['油', 'あぶら'], calories: 111, protein: 0, fat: 12.0, carbs: 0, micros: { salt: 0, saturatedFat: 1.6, vitaminE: 0.9, n6Fat: 1.0 } },
  { name: 'バター (大さじ1 12g)', aliases: ['ばたー'], calories: 89, protein: 0.1, fat: 9.8, carbs: 0, micros: { cholesterol: 25, salt: 0.2, saturatedFat: 6.2, potassium: 2, calcium: 2, phosphorus: 2, vitaminA: 60, vitaminD: 0.1 } },
  { name: 'カレールー (1食分 20g)', aliases: ['カレー'], calories: 102, protein: 1.2, fat: 7.0, carbs: 8.5, micros: { salt: 2.1, fiber: 1.0, saturatedFat: 3.5, potassium: 50, calcium: 10, magnesium: 5, phosphorus: 15, iron: 0.3, zinc: 0.1, copper: 0.02 } },

  // === 料理・外食・定番メニュー ===
  { name: 'ビーフカレーライス (1人前)', aliases: ['カレー', 'かれー'], calories: 700, protein: 16.0, fat: 25.0, carbs: 100.0, micros: { salt: 2.8, fiber: 4.5, potassium: 500, iron: 2.5, vitaminC: 5, cholesterol: 40, saturatedFat: 8.0, calcium: 40, magnesium: 45, phosphorus: 180, zinc: 3.0, copper: 0.2, vitaminB1: 0.15, vitaminB2: 0.2, vitaminB6: 0.3, vitaminB12: 1.0, folate: 30, vitaminE: 2.5 } },
  { name: 'オムライス (1人前)', aliases: [], calories: 650, protein: 18.0, fat: 20.0, carbs: 95.0, micros: { salt: 3.5, fiber: 2.0, potassium: 350, iron: 2.0, cholesterol: 420, saturatedFat: 6.5, calcium: 50, magnesium: 35, phosphorus: 200, zinc: 1.8, copper: 0.15, vitaminB1: 0.1, vitaminB2: 0.4, vitaminB6: 0.2, vitaminB12: 0.8, folate: 40, vitaminC: 10, vitaminE: 2.5 } },
  { name: 'かつ丼 (1人前)', aliases: ['カツ丼', 'カツどん'], calories: 850, protein: 30.0, fat: 30.0, carbs: 110.0, micros: { salt: 4.5, fiber: 3.0, potassium: 450, iron: 2.5, vitaminB1: 0.8, cholesterol: 250, saturatedFat: 8.0, calcium: 60, magnesium: 50, phosphorus: 250, zinc: 2.5, copper: 0.2, vitaminB2: 0.4, vitaminB6: 0.4, vitaminB12: 1.0, folate: 50, vitaminC: 5, vitaminE: 3.0 } },
  { name: 'うな重 (1人前)', aliases: ['鰻'], calories: 750, protein: 25.0, fat: 25.0, carbs: 100.0, micros: { salt: 3.0, vitaminD: 15, calcium: 40, iron: 1.5, cholesterol: 180, saturatedFat: 6.0, fiber: 1.5, potassium: 400, magnesium: 40, phosphorus: 280, zinc: 2.0, copper: 0.15, vitaminB1: 0.5, vitaminB2: 0.6, vitaminB6: 0.2, vitaminB12: 4.0, folate: 20, vitaminA: 1500, vitaminE: 4.0 } },
  { name: 'すき焼き (1人前)', aliases: ['すきやき'], calories: 650, protein: 25.0, fat: 45.0, carbs: 35.0, micros: { salt: 4.0, fiber: 4.0, iron: 3.5, potassium: 600, cholesterol: 80, saturatedFat: 15.0, calcium: 150, magnesium: 60, phosphorus: 250, zinc: 4.5, copper: 0.2, vitaminB1: 0.2, vitaminB2: 0.3, vitaminB6: 0.4, vitaminB12: 1.5, folate: 60, vitaminC: 10, vitaminE: 3.0 } },
  { name: 'おでん (1人前 5種)', aliases: ['オデン'], calories: 280, protein: 20.0, fat: 12.0, carbs: 25.0, micros: { salt: 4.5, fiber: 3.5, calcium: 150, iron: 2.0, potassium: 350, cholesterol: 50, saturatedFat: 2.5, magnesium: 40, phosphorus: 180, zinc: 1.5, copper: 0.1, vitaminB1: 0.15, vitaminB2: 0.2, vitaminB6: 0.2, vitaminB12: 1.5, folate: 30, vitaminC: 5, vitaminE: 1.0 } },
  { name: '筑前煮 (1小鉢)', aliases: ['煮物'], calories: 150, protein: 8.0, fat: 6.0, carbs: 18.0, micros: { salt: 1.8, fiber: 4.0, potassium: 400, iron: 1.0, cholesterol: 20, saturatedFat: 1.5, calcium: 40, magnesium: 30, phosphorus: 80, zinc: 0.8, copper: 0.1, vitaminB1: 0.08, vitaminB2: 0.1, vitaminB6: 0.15, folate: 25, vitaminC: 10, vitaminE: 1.0 } },
  { name: '青椒肉絲 (1人前)', aliases: ['チンジャオロース'], calories: 320, protein: 15.0, fat: 22.0, carbs: 15.0, micros: { salt: 2.5, fiber: 2.5, vitaminC: 30, iron: 1.5, potassium: 350, cholesterol: 40, saturatedFat: 4.5, calcium: 30, magnesium: 35, phosphorus: 150, zinc: 1.8, copper: 0.15, vitaminB1: 0.5, vitaminB2: 0.2, vitaminB6: 0.3, folate: 30, vitaminE: 2.0 } },
  { name: '回鍋肉 (1人前)', aliases: ['ホイコーロー'], calories: 380, protein: 14.0, fat: 28.0, carbs: 18.0, micros: { salt: 2.8, fiber: 3.0, vitaminC: 25, iron: 1.2, potassium: 400, cholesterol: 45, saturatedFat: 8.0, calcium: 40, magnesium: 30, phosphorus: 140, zinc: 1.5, copper: 0.1, vitaminB1: 0.4, vitaminB2: 0.15, vitaminB6: 0.25, folate: 40, vitaminE: 2.5 } },
  { name: '天津飯 (1人前)', aliases: ['てんしんはん'], calories: 700, protein: 22.0, fat: 25.0, carbs: 90.0, micros: { cholesterol: 420, salt: 4.0, fiber: 2.0, iron: 2.5, potassium: 300, saturatedFat: 6.0, calcium: 60, magnesium: 40, phosphorus: 250, zinc: 2.0, copper: 0.15, vitaminB1: 0.1, vitaminB2: 0.4, vitaminB6: 0.15, vitaminB12: 1.0, folate: 40, vitaminC: 5, vitaminE: 3.0 } },
  { name: '八宝菜 (1人前)', aliases: ['はっぽうさい'], calories: 300, protein: 15.0, fat: 18.0, carbs: 15.0, micros: { salt: 2.5, fiber: 3.5, vitaminC: 20, iron: 1.5, potassium: 450, cholesterol: 60, saturatedFat: 3.5, calcium: 50, magnesium: 40, phosphorus: 150, zinc: 1.5, copper: 0.15, vitaminB1: 0.2, vitaminB2: 0.2, vitaminB6: 0.2, vitaminB12: 1.0, folate: 40, vitaminE: 2.0 } },
  { name: '肉じゃが (1小鉢)', aliases: ['にくじゃが'], calories: 250, protein: 8.0, fat: 10.0, carbs: 30.0, micros: { salt: 1.5, fiber: 2.5, vitaminC: 15, potassium: 450, iron: 1.2, cholesterol: 25, saturatedFat: 3.5, calcium: 20, magnesium: 30, phosphorus: 100, zinc: 1.2, copper: 0.1, vitaminB1: 0.15, vitaminB2: 0.1, vitaminB6: 0.2, vitaminB12: 0.5, folate: 20, vitaminE: 1.5 } },
  { name: 'ロールキャベツ (1個)', aliases: [], calories: 120, protein: 7.0, fat: 7.0, carbs: 7.0, micros: { salt: 1.2, fiber: 1.5, vitaminC: 10, potassium: 200, iron: 0.8, cholesterol: 20, saturatedFat: 2.5, calcium: 30, magnesium: 15, phosphorus: 70, zinc: 1.0, copper: 0.05, vitaminB1: 0.1, vitaminB2: 0.1, vitaminB6: 0.1, vitaminB12: 0.3, folate: 20, vitaminE: 0.8 } },
  { name: 'カニクリームコロッケ (1個)', aliases: ['コロッケ'], calories: 160, protein: 3.5, fat: 10.0, carbs: 12.0, micros: { salt: 0.8, fiber: 0.5, calcium: 30, potassium: 120, cholesterol: 15, saturatedFat: 3.5, iron: 0.4, magnesium: 10, phosphorus: 50, zinc: 0.5, copper: 0.05, vitaminB1: 0.05, vitaminB2: 0.08, vitaminB6: 0.05, vitaminB12: 0.5, folate: 10, vitaminC: 2, vitaminE: 1.5 } },
  { name: 'ポテトコロッケ (1個)', aliases: ['コロッケ'], calories: 150, protein: 2.5, fat: 9.0, carbs: 14.0, micros: { salt: 0.8, fiber: 1.5, potassium: 250, vitaminC: 8, cholesterol: 5, saturatedFat: 2.5, calcium: 10, iron: 0.5, magnesium: 15, phosphorus: 40, zinc: 0.4, copper: 0.05, vitaminB1: 0.05, vitaminB2: 0.03, vitaminB6: 0.1, folate: 10, vitaminE: 1.5 } },
  { name: '餃子1個', aliases: ['ぎょうざ', 'ギョウザ'], calories: 40, protein: 1.5, fat: 2.0, carbs: 3.5, micros: { salt: 0.2, fiber: 0.3, potassium: 45, cholesterol: 5, saturatedFat: 0.6, calcium: 5, iron: 0.2, magnesium: 4, phosphorus: 15, zinc: 0.2, copper: 0.01, vitaminB1: 0.02, vitaminB2: 0.01, vitaminB6: 0.02, folate: 5, vitaminC: 1, vitaminE: 0.2 } },
  { name: 'お好み焼き (1枚)', aliases: ['おこのみやき'], calories: 550, protein: 20.0, fat: 20.0, carbs: 65.0, micros: { salt: 3.5, fiber: 4.5, calcium: 80, iron: 2.5, potassium: 500, cholesterol: 220, saturatedFat: 5.5, magnesium: 60, phosphorus: 250, zinc: 2.0, copper: 0.2, vitaminB1: 0.3, vitaminB2: 0.4, vitaminB6: 0.3, vitaminB12: 1.0, folate: 60, vitaminC: 20, vitaminE: 3.5 } },
  { name: 'サラダ（グリーンサラダ） (1人前)', aliases: ['生野菜'], calories: 30, protein: 1.5, fat: 0.5, carbs: 6.0, micros: { fiber: 2.0, vitaminC: 20, potassium: 300, salt: 0, folate: 50, calcium: 30, iron: 0.5, magnesium: 15, phosphorus: 25, zinc: 0.2, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.04, vitaminB6: 0.05, vitaminE: 1.0 } },
  { name: 'サンドイッチ（たまご） (1パック)', aliases: ['パン'], calories: 320, protein: 10.0, fat: 18.0, carbs: 30.0, micros: { salt: 1.5, fiber: 1.5, calcium: 40, iron: 1.5, cholesterol: 210, saturatedFat: 4.5, potassium: 150, magnesium: 20, phosphorus: 120, zinc: 1.0, copper: 0.1, vitaminB1: 0.1, vitaminB2: 0.25, vitaminB6: 0.1, vitaminB12: 0.5, folate: 30, vitaminE: 2.0 } },
  { name: 'マクドナルド ビッグマック (1個)', aliases: ['マック', 'マクド', 'ハンバーガー'], calories: 525, protein: 26.0, fat: 28.3, carbs: 41.8, micros: { salt: 2.6, fiber: 3.0, calcium: 240, iron: 3.5, potassium: 400, cholesterol: 75, saturatedFat: 10.5, magnesium: 45, phosphorus: 300, zinc: 4.5, copper: 0.2, vitaminB1: 0.3, vitaminB2: 0.4, vitaminB6: 0.3, vitaminB12: 2.0, folate: 60, vitaminC: 2, vitaminE: 1.5 } },

  // === お菓子・デザート・飲料 ===
  { name: '回転焼きこしあん (1個)', aliases: ['今川焼き', '大判焼き', '御座候'], calories: 200, protein: 5.0, fat: 1.5, carbs: 42.0, micros: { fiber: 2.5, salt: 0.2, iron: 1.0, potassium: 120, calcium: 15, magnesium: 20, phosphorus: 50, zinc: 0.5, copper: 0.05, vitaminB1: 0.05, vitaminB2: 0.04, vitaminB6: 0.05, folate: 10 } },
  { name: '回転焼きしろあん (1個)', aliases: ['今川焼き', '大判焼き', '御座候', '白あん'], calories: 205, protein: 5.5, fat: 1.5, carbs: 43.0, micros: { fiber: 2.5, salt: 0.2, iron: 1.2, potassium: 130, calcium: 18, magnesium: 22, phosphorus: 55, zinc: 0.6, copper: 0.06, vitaminB1: 0.06, vitaminB2: 0.05, vitaminB6: 0.06, folate: 12 } },
  { name: 'みたらし団子 (1本 50g)', aliases: ['和菓子', 'だんご'], calories: 98, protein: 1.5, fat: 0.2, carbs: 22.5, micros: { salt: 0.4, fiber: 0.3, potassium: 25, calcium: 5, iron: 0.2, magnesium: 5, phosphorus: 15, zinc: 0.1, copper: 0.02, vitaminB1: 0.01, vitaminB2: 0.01 } },
  { name: '大福 (1個 80g)', aliases: ['和菓子'], calories: 190, protein: 3.5, fat: 0.5, carbs: 43.0, micros: { fiber: 2.0, salt: 0.1, iron: 0.8, potassium: 90, calcium: 10, magnesium: 15, phosphorus: 40, zinc: 0.4, copper: 0.04, vitaminB1: 0.04, vitaminB2: 0.03, vitaminB6: 0.04, folate: 8 } },
  { name: 'どら焼き (1個 80g)', aliases: ['和菓子'], calories: 227, protein: 4.5, fat: 1.5, carbs: 49.0, micros: { fiber: 1.5, salt: 0.3, iron: 0.9, potassium: 110, cholesterol: 40, calcium: 20, magnesium: 18, phosphorus: 60, zinc: 0.5, copper: 0.05, vitaminB1: 0.05, vitaminB2: 0.08, vitaminB6: 0.05, folate: 15 } },
  { name: 'アズキバー（井村屋）(1本)', aliases: ['あずきバー', 'アイス'], calories: 110, protein: 2.0, fat: 0.5, carbs: 25.0, micros: { fiber: 1.5, salt: 0.1, iron: 0.5, potassium: 80, calcium: 8, magnesium: 15, phosphorus: 30, zinc: 0.3, copper: 0.04, vitaminB1: 0.03, vitaminB2: 0.02 } },
  { name: 'ロールケーキ (1切れ)', aliases: ['ケーキ'], calories: 250, protein: 4.0, fat: 14.0, carbs: 25.0, micros: { salt: 0.2, calcium: 30, cholesterol: 90, saturatedFat: 7.0, fiber: 0.5, iron: 0.4, potassium: 80, magnesium: 8, phosphorus: 50, zinc: 0.4, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.1, vitaminB6: 0.03, vitaminB12: 0.2, folate: 15, vitaminE: 0.8 } },
  { name: 'ショートケーキ (1切れ 100g)', aliases: ['ケーキ'], calories: 308, protein: 4.5, fat: 20.0, carbs: 28.0, micros: { salt: 0.2, calcium: 40, cholesterol: 110, saturatedFat: 10.5, vitaminC: 5, fiber: 0.5, iron: 0.5, potassium: 100, magnesium: 10, phosphorus: 60, zinc: 0.5, copper: 0.04, vitaminB1: 0.04, vitaminB2: 0.15, vitaminB6: 0.04, vitaminB12: 0.3, folate: 20, vitaminE: 1.2 } },
  { name: 'チーズケーキ (1切れ 100g)', aliases: ['ケーキ'], calories: 315, protein: 7.0, fat: 22.0, carbs: 22.0, micros: { salt: 0.4, calcium: 70, cholesterol: 100, saturatedFat: 12.0, fiber: 0.2, iron: 0.4, potassium: 90, magnesium: 12, phosphorus: 100, zinc: 0.8, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.2, vitaminB6: 0.04, vitaminB12: 0.4, folate: 15, vitaminE: 1.0 } },
  { name: 'スポンジケーキ (1切れ)', aliases: ['ケーキ'], calories: 200, protein: 3.5, fat: 8.0, carbs: 28.0, micros: { salt: 0.2, calcium: 20, cholesterol: 80, saturatedFat: 3.5, fiber: 0.3, iron: 0.3, potassium: 60, magnesium: 6, phosphorus: 40, zinc: 0.3, copper: 0.02, vitaminB1: 0.03, vitaminB2: 0.08, vitaminB6: 0.02, vitaminB12: 0.2, folate: 10, vitaminE: 0.5 } },
  { name: 'シュークリーム (1個 80g)', aliases: ['デザート'], calories: 180, protein: 4.0, fat: 11.0, carbs: 16.0, micros: { salt: 0.2, calcium: 40, cholesterol: 120, saturatedFat: 5.5, fiber: 0.2, iron: 0.4, potassium: 80, magnesium: 8, phosphorus: 60, zinc: 0.4, copper: 0.03, vitaminB1: 0.04, vitaminB2: 0.15, vitaminB6: 0.03, vitaminB12: 0.3, folate: 15, vitaminE: 0.8 } },
  { name: 'プリン (1個 100g)', aliases: ['デザート'], calories: 126, protein: 5.5, fat: 5.0, carbs: 14.7, micros: { salt: 0.1, calcium: 65, cholesterol: 110, saturatedFat: 2.2, fiber: 0, iron: 0.5, potassium: 110, magnesium: 10, phosphorus: 80, zinc: 0.5, copper: 0.02, vitaminB1: 0.04, vitaminB2: 0.2, vitaminB6: 0.04, vitaminB12: 0.4, folate: 15, vitaminE: 0.5 } },
  { name: 'ポテトチップス (1袋 60g)', aliases: ['スナック', 'ポテチ'], calories: 336, protein: 2.8, fat: 21.6, carbs: 32.4, micros: { salt: 0.6, fiber: 2.5, potassium: 700, saturatedFat: 3.5, calcium: 15, iron: 0.8, magnesium: 25, phosphorus: 60, zinc: 0.5, copper: 0.1, vitaminB1: 0.1, vitaminB2: 0.03, vitaminB6: 0.2, folate: 20, vitaminC: 10, vitaminE: 4.0 } },
  { name: 'クッキー (3枚 30g)', aliases: ['お菓子'], calories: 156, protein: 2.0, fat: 8.0, carbs: 19.0, micros: { salt: 0.2, fiber: 0.5, cholesterol: 15, saturatedFat: 4.0, calcium: 8, iron: 0.2, potassium: 30, magnesium: 4, phosphorus: 20, zinc: 0.2, copper: 0.02, vitaminB1: 0.02, vitaminB2: 0.03, vitaminB6: 0.01, folate: 5, vitaminE: 0.8 } },
  { name: 'せんべい (1枚 15g)', aliases: ['お菓子', '煎餅'], calories: 57, protein: 1.1, fat: 0.1, carbs: 13.0, micros: { salt: 0.3, fiber: 0.1, potassium: 15, calcium: 2, iron: 0.1, magnesium: 3, phosphorus: 10, zinc: 0.1, copper: 0.01, vitaminB1: 0.01, vitaminB2: 0.01 } },
  { name: 'オレオ (1個)', aliases: ['お菓子', 'クッキー'], calories: 53, protein: 0.5, fat: 2.2, carbs: 7.7, micros: { salt: 0.1, fiber: 0.2, calcium: 5, iron: 0.2, saturatedFat: 1.0, potassium: 15, magnesium: 3, phosphorus: 10, zinc: 0.1, copper: 0.02, vitaminB1: 0.01, vitaminB2: 0.01, vitaminE: 0.2 } },
  { name: 'リッツバニラサンド (1個)', aliases: ['お菓子', 'クラッカー', 'リッツ'], calories: 48, protein: 0.4, fat: 2.5, carbs: 5.9, micros: { salt: 0.1, fiber: 0.1, calcium: 4, saturatedFat: 1.1, iron: 0.1, potassium: 10, magnesium: 2, phosphorus: 8, zinc: 0.1, copper: 0.01, vitaminE: 0.2 } },
  { name: 'リッツチョコサンド (1個)', aliases: ['お菓子', 'クラッカー', 'リッツ'], calories: 47, protein: 0.5, fat: 2.3, carbs: 6.1, micros: { salt: 0.1, fiber: 0.2, calcium: 5, saturatedFat: 1.0, iron: 0.2, potassium: 15, magnesium: 4, phosphorus: 12, zinc: 0.1, copper: 0.02, vitaminE: 0.2 } },
  { name: 'リッツチーズサンド (1個)', aliases: ['お菓子', 'クラッカー', 'リッツ'], calories: 49, protein: 0.6, fat: 2.8, carbs: 5.4, micros: { salt: 0.1, fiber: 0.1, calcium: 15, saturatedFat: 1.3, iron: 0.1, potassium: 12, magnesium: 3, phosphorus: 15, zinc: 0.1, copper: 0.01, vitaminB2: 0.02, vitaminE: 0.3 } },
  { name: 'キットカット (1枚)', aliases: ['お菓子', 'チョコレート', 'チョコ'], calories: 62, protein: 0.8, fat: 3.5, carbs: 7.0, micros: { salt: 0, fiber: 0.2, calcium: 10, saturatedFat: 2.0, iron: 0.2, potassium: 25, magnesium: 6, phosphorus: 15, zinc: 0.1, copper: 0.02, vitaminB1: 0.01, vitaminB2: 0.02, vitaminE: 0.3 } },
  { name: 'ブラックサンダーミニ (13g)', aliases: ['お菓子', 'チョコレート', 'チョコ'], calories: 69, protein: 0.8, fat: 3.7, carbs: 8.1, micros: { salt: 0.1, fiber: 0.3, calcium: 8, saturatedFat: 2.1, iron: 0.2, potassium: 20, magnesium: 5, phosphorus: 12, zinc: 0.1, copper: 0.02, vitaminB1: 0.01, vitaminB2: 0.01, vitaminE: 0.3 } },
  { name: 'ブラックサンダー (36g)', aliases: ['お菓子', 'チョコレート', 'チョコ'], calories: 192, protein: 2.2, fat: 10.3, carbs: 22.5, micros: { salt: 0.3, fiber: 0.8, calcium: 22, saturatedFat: 5.8, iron: 0.6, potassium: 55, magnesium: 14, phosphorus: 33, zinc: 0.3, copper: 0.05, vitaminB1: 0.03, vitaminB2: 0.03, vitaminE: 0.8 } },
  { name: 'コーヒー ブラック (1杯 150ml)', aliases: ['こーひー'], calories: 6, protein: 0.3, fat: 0, carbs: 1.1, micros: { salt: 0, potassium: 100, magnesium: 5, calcium: 2, iron: 0, phosphorus: 2, zinc: 0, copper: 0, vitaminB2: 0.01, vitaminB6: 0.01, folate: 1 } },
  { name: '緑茶/ウーロン茶/麦茶 (1杯 200ml)', aliases: ['お茶', 'ティー'], calories: 0, protein: 0, fat: 0, carbs: 0, micros: { salt: 0, potassium: 25, calcium: 2, magnesium: 1, phosphorus: 1, iron: 0, zinc: 0, copper: 0, vitaminB2: 0.01, vitaminC: 6, folate: 2 } },
  { name: 'コーラ (1杯 200ml)', aliases: ['ジュース'], calories: 92, protein: 0, fat: 0, carbs: 22.8, micros: { salt: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0, iron: 0, zinc: 0, copper: 0 } },
  { name: 'サッポロ黒ラベル350ml', aliases: ['ビール', '生ビール'], calories: 140, protein: 1.0, fat: 0.0, carbs: 10.5, micros: { salt: 0, potassium: 120, phosphorus: 50, calcium: 10, magnesium: 18, iron: 0.1, zinc: 0.1, copper: 0.02, vitaminB2: 0.04, vitaminB6: 0.04, folate: 15 } },
  { name: '発泡酒 (1缶 350ml)', aliases: ['ビール'], calories: 158, protein: 0.5, fat: 0, carbs: 12.6, micros: { salt: 0, potassium: 70, phosphorus: 30, calcium: 5, magnesium: 10, iron: 0.1, zinc: 0.1, copper: 0.01, vitaminB2: 0.02, vitaminB6: 0.02, folate: 7 } },
  { name: 'レモンサワー (1杯 350ml)', aliases: ['チューハイ', 'お酒'], calories: 165, protein: 0, fat: 0, carbs: 8.0, micros: { salt: 0.1, vitaminC: 5, potassium: 15, calcium: 2, magnesium: 2, phosphorus: 2, iron: 0, zinc: 0 } },
  { name: '日本酒 (1合 180ml)', aliases: ['お酒'], calories: 185, protein: 0.7, fat: 0, carbs: 8.8, micros: { salt: 0, potassium: 10, calcium: 2, magnesium: 2, phosphorus: 10, iron: 0.1, zinc: 0.1, copper: 0.02, vitaminB2: 0.02, vitaminB6: 0.02, folate: 2 } },
  { name: 'ウイスキーシングル (30ml)', aliases: ['ハイボール', 'ウィスキー'], calories: 71, protein: 0.0, fat: 0.0, carbs: 0.0, micros: { salt: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0, iron: 0, zinc: 0 } },
  { name: 'ワイン 赤 (グラス1杯 120ml)', aliases: ['お酒'], calories: 88, protein: 0.2, fat: 0, carbs: 1.8, micros: { salt: 0, potassium: 130, iron: 0.5, calcium: 10, magnesium: 12, phosphorus: 15, zinc: 0.1, copper: 0.02, vitaminB2: 0.02, vitaminB6: 0.02, folate: 2 } },
];


export default function App() {
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
  
  // ユーザープロファイル
  const defaultProfile = {
    gender: 'male',
    age: 30,
    height: 170,
    weight: 65,
    bodyFat: '',
    activityLevel: 'none',
    goal: 'health',
    pfcTarget: { p: 20, f: 20, c: 60 },
    favoriteGroups: [
      { id: 'g1', name: 'お気に入り①' },
      { id: 'g2', name: 'お気に入り②' },
      { id: 'g3', name: 'お気に入り③' },
      { id: 'g4', name: 'お気に入り④' }
    ]
  };
  const [userProfile, setUserProfile] = useState(defaultProfile);
  const [hasProfile, setHasProfile] = useState(false);

  const [customPresets, setCustomPresets] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  
  const [currentDate, setCurrentDate] = useState(new Date());

  // 入力フォームのステート
  const [inputType, setInputType] = useState('breakfast');
  const [inputName, setInputName] = useState('');
  
  const [inputProtein, setInputProtein] = useState('');
  const [inputFat, setInputFat] = useState('');
  const [inputCarbs, setInputCarbs] = useState('');
  const [inputCalories, setInputCalories] = useState('');
  const [autoCalcCal, setAutoCalcCal] = useState(true);

  const [inputMicros, setInputMicros] = useState({});
  const [showMicroDetails, setShowMicroDetails] = useState(false);
  const [showSummaryMicros, setShowSummaryMicros] = useState(false);

  const [baseNutrition, setBaseNutrition] = useState(null);
  const [currentScale, setCurrentScale] = useState(100);
  const [customScaleInput, setCustomScaleInput] = useState('');

  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(''); 
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const [activeInputTab, setActiveInputTab] = useState('favorites');
  const [activeFavGroupFilter, setActiveFavGroupFilter] = useState('all');
  const [isEditMode, setIsEditMode] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [aiAdvice, setAiAdvice] = useState('');
  const [isAdvicing, setIsAdvicing] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile'); // profile | database | folders
  const [tempProfile, setTempProfile] = useState({ ...userProfile });
  
  const [expandedFoodIdx, setExpandedFoodIdx] = useState(null);
  const [moveTargetItem, setMoveTargetItem] = useState(null);
  const [selectedGroupIdForSave, setSelectedGroupIdForSave] = useState('g1');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    if (isSettingsOpen) setTempProfile({ ...userProfile });
  }, [isSettingsOpen, userProfile]);

  // Authの初期化と永続化の設定
  useEffect(() => {
    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth init error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile({ ...defaultProfile, ...docSnap.data() });
        setHasProfile(true);
      }
    }, (error) => console.error("Error fetching profile:", error));

    const mealsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'meals');
    const unsubscribeMeals = onSnapshot(mealsRef, (snapshot) => {
      const mealsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeals(mealsData);
    }, (error) => console.error("Error fetching meals:", error));

    const presetsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'presets');
    const unsubscribePresets = onSnapshot(presetsRef, (snapshot) => {
      setCustomPresets(snapshot.docs.map(doc => doc.data()));
    }, (error) => console.error("Error fetching presets:", error));

    const searchHistoryRef = collection(db, 'artifacts', appId, 'users', user.uid, 'searchHistory');
    const unsubscribeSearchHistory = onSnapshot(searchHistoryRef, (snapshot) => {
      setSearchHistory(snapshot.docs.map(doc => doc.data()).sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => console.error("Error fetching search history:", error));

    return () => {
      unsubscribeProfile();
      unsubscribeMeals();
      unsubscribePresets();
      unsubscribeSearchHistory();
    };
  }, [user]);

  const currentMicrosConfig = useMemo(() => getMicronutrientsConfig(userProfile.gender), [userProfile.gender]);
  const favoriteGroups = userProfile.favoriteGroups || defaultProfile.favoriteGroups;

  // --- カロリー・PFC目標の計算 ---
  const targets = useMemo(() => {
    if (!hasProfile) return DEFAULT_TARGETS;

    const w = parseFloat(userProfile.weight) || 0;
    const h = parseFloat(userProfile.height) || 0;
    const a = parseFloat(userProfile.age) || 0;
    const bf = parseFloat(userProfile.bodyFat);
    let bmr = 0;

    if (w > 0 && h > 0 && a > 0) {
      if (!isNaN(bf) && bf > 0) {
        const lbm = w * (1 - (bf / 100));
        bmr = 370 + (21.6 * lbm);
      } else {
        bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr += userProfile.gender === 'male' ? 5 : -161;
      }
    }

    const multiplier = ACTIVITY_LEVELS[userProfile.activityLevel]?.multiplier || 1.2;
    const tdee = Math.round(bmr * multiplier) || DEFAULT_TARGETS.calories;

    const currentPfcTarget = userProfile.pfcTarget || PFC_TARGET_RATIOS;

    const p = Math.round((tdee * (currentPfcTarget.p / 100)) / 4);
    const f = Math.round((tdee * (currentPfcTarget.f / 100)) / 9);
    const c = Math.round((tdee * (currentPfcTarget.c / 100)) / 4);
    
    return {
      calories: tdee,
      protein: p,
      fat: f,
      carbs: c,
      sugar: Math.max(0, c - currentMicrosConfig.fiber.recommended),
      fiber: currentMicrosConfig.fiber.recommended,
      salt: currentMicrosConfig.salt.upperLimit,
    };
  }, [userProfile, hasProfile, currentMicrosConfig]);

  const currentPfcTarget = useMemo(() => userProfile.pfcTarget || PFC_TARGET_RATIOS, [userProfile]);

  useEffect(() => {
    setIsEditMode(false);
  }, [activeInputTab]);

  const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const displayMeals = useMemo(() => {
    return meals.filter(meal => {
      const mealDate = new Date(meal.timestamp);
      return isSameDay(mealDate, currentDate);
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, [meals, currentDate]);

  const uniqueMeals = useMemo(() => {
    const map = new Map();
    [...meals].sort((a, b) => b.timestamp - a.timestamp).forEach(meal => {
      if (!map.has(meal.name)) map.set(meal.name, meal);
    });
    return Array.from(map.values());
  }, [meals]);

  const filteredFavorites = useMemo(() => {
    if (!inputName) return customPresets;
    const lower = inputName.toLowerCase();
    return customPresets.filter(p => p.name.toLowerCase().includes(lower));
  }, [customPresets, inputName]);

  const filteredFavoritesByGroup = useMemo(() => {
    if (activeFavGroupFilter === 'all') {
      // 「すべて」の時は名前でユニーク（重複排除）にする
      const map = new Map();
      filteredFavorites.forEach(p => {
        if (!map.has(p.name)) {
          map.set(p.name, p);
        }
      });
      return Array.from(map.values());
    } else {
      return filteredFavorites.filter(p => p.groupId === activeFavGroupFilter || (!p.groupId && activeFavGroupFilter === 'g1'));
    }
  }, [filteredFavorites, activeFavGroupFilter]);

  const filteredMealHistory = useMemo(() => {
    if (!inputName) return uniqueMeals;
    const lower = inputName.toLowerCase();
    return uniqueMeals.filter(m => m.name.toLowerCase().includes(lower));
  }, [uniqueMeals, inputName]);

  const filteredAiHistory = useMemo(() => {
    if (!inputName) return searchHistory;
    const lower = inputName.toLowerCase();
    return searchHistory.filter(s => s.name.toLowerCase().includes(lower));
  }, [searchHistory, inputName]);

  const totals = useMemo(() => {
    const base = { calories: 0, protein: 0, fat: 0, carbs: 0, micros: {} };
    Object.keys(currentMicrosConfig).forEach(key => base.micros[key] = 0);
    
    const calculated = displayMeals.reduce((acc, meal) => {
      const newAcc = {
        ...acc,
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        fat: acc.fat + meal.fat,
        carbs: acc.carbs + meal.carbs,
      };
      Object.keys(currentMicrosConfig).forEach(key => {
        newAcc.micros[key] = acc.micros[key] + (meal.micros?.[key] || 0);
      });
      return newAcc;
    }, base);
    
    calculated.sugar = Math.max(0, calculated.carbs - (calculated.micros.fiber || 0));
    
    return calculated;
  }, [displayMeals, currentMicrosConfig]);

  const pfcRatios = useMemo(() => {
    const pCal = totals.protein * 4;
    const fCal = totals.fat * 9;
    const cCal = totals.carbs * 4;
    const total = pCal + fCal + cCal;
    if (total === 0) return { p: 0, f: 0, c: 0 };
    return { p: Math.round((pCal / total) * 100), f: Math.round((fCal / total) * 100), c: Math.round((cCal / total) * 100) };
  }, [totals]);

  const handleNameChange = (e) => {
    setInputName(e.target.value);
  };

  const applyPreset = (preset) => {
    setInputName(preset.name);
    setAutoCalcCal(false);
    setInputCalories(preset.calories.toString());
    setInputProtein(preset.protein.toString());
    setInputFat(preset.fat.toString());
    setInputCarbs(preset.carbs.toString());
    setInputMicros(preset.micros || {});

    setBaseNutrition({
      calories: preset.calories,
      protein: preset.protein,
      fat: preset.fat,
      carbs: preset.carbs,
      micros: preset.micros || {}
    });
    setCurrentScale(100);
    setCustomScaleInput('');
  };

  const handleDirectAddMeal = async (preset) => {
    if (!user) return;
    const now = new Date();
    const mealDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());

    const parsedMicros = {};
    Object.keys(currentMicrosConfig).forEach(key => parsedMicros[key] = parseFloat(preset.micros?.[key]) || 0);

    const newMeal = {
      type: inputType,
      name: preset.name,
      calories: parseFloat(preset.calories) || 0, 
      protein: parseFloat(preset.protein) || 0,
      fat: parseFloat(preset.fat) || 0, 
      carbs: parseFloat(preset.carbs) || 0,
      micros: parsedMicros,
      timestamp: mealDate.getTime(),
    };

    try {
      await setDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'meals'), Date.now().toString()), newMeal);
      showToast(`${preset.name} を記録しました`);
    } catch (error) {
      console.error("Error adding meal directly:", error);
    }
  };

  const handleManualInput = (setter) => (e) => {
    setter(e.target.value);
    setBaseNutrition(null);
    setCurrentScale(100);
  };

  const handleMicroChange = (key, value) => {
    setInputMicros({ ...inputMicros, [key]: value });
    setBaseNutrition(null);
    setCurrentScale(100);
  };

  const handleScaleChange = (scale) => {
    if (isNaN(scale) || scale <= 0) return;
    
    let base = baseNutrition;
    if (!base) {
      base = {
        calories: parseFloat(inputCalories) || 0,
        protein: parseFloat(inputProtein) || 0,
        fat: parseFloat(inputFat) || 0,
        carbs: parseFloat(inputCarbs) || 0,
        micros: {}
      };
      Object.keys(currentMicrosConfig).forEach(key => {
        base.micros[key] = parseFloat(inputMicros[key]) || 0;
      });
      setBaseNutrition(base);
    }
    
    setCurrentScale(scale);
    
    const ratio = scale / 100;
    const formatNum = (num) => Math.round(num * 10) / 10;
    
    if (!autoCalcCal) setInputCalories(Math.round(base.calories * ratio).toString());
    setInputProtein(formatNum(base.protein * ratio).toString());
    setInputFat(formatNum(base.fat * ratio).toString());
    setInputCarbs(formatNum(base.carbs * ratio).toString());
    
    const newMicros = {};
    Object.keys(currentMicrosConfig).forEach(key => {
      newMicros[key] = formatNum((base.micros[key] || 0) * ratio).toString();
    });
    setInputMicros(newMicros);
  };

  useEffect(() => {
    if (autoCalcCal) {
      const p = parseFloat(inputProtein) || 0;
      const f = parseFloat(inputFat) || 0;
      const c = parseFloat(inputCarbs) || 0;
      if (p > 0 || f > 0 || c > 0) {
        const calculatedCal = Math.round((p * 4) + (f * 9) + (c * 4));
        setInputCalories(calculatedCal.toString());
      } else if (!inputProtein && !inputFat && !inputCarbs) {
        setInputCalories('');
      }
    }
  }, [inputProtein, inputFat, inputCarbs, autoCalcCal]);

  const handleGetAIAdvice = async () => {
    setIsAdvicing(true);
    setAiAdvice('');
    try {
      const apiKey = "";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      
      const mealListStr = displayMeals.map(m => `- ${MEAL_TYPES[m.type]?.label || '食事'}: ${m.name} (${m.calories}kcal, P:${m.protein}g, F:${m.fat}g, C:${m.carbs}g)`).join('\n');

      const prompt = `あなたはプロの栄養士です。以下のユーザーの今日の食事記録と目標値を分析し、
1. 今日の食事の良かった点
2. PFCバランスや微量栄養素（塩分、食物繊維など）の改善点
3. 不足している栄養素を補うための、具体的でおすすめの食事メニュー（または食材）
を簡潔に（全体で300文字程度で）アドバイスしてください。親しみやすいトーンでお願いします。

【目標】
カロリー: ${targets.calories}kcal, タンパク質: ${targets.protein}g, 脂質: ${targets.fat}g, 炭水化物: ${targets.carbs}g

【現在の摂取量】
カロリー: ${Math.round(totals.calories)}kcal, タンパク質: ${Math.round(totals.protein)}g, 脂質: ${Math.round(totals.fat)}g, 炭水化物: ${Math.round(totals.carbs)}g
食物繊維: ${Math.round((totals.micros.fiber || 0))}g (目標 ${targets.fiber}g)
塩分: ${Math.round((totals.micros.salt || 0))}g (目標 ${targets.salt}g以下)

【今日の食事記録】
${mealListStr || '（まだ記録がありません）'}`;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };

      let retries = 5; let delay = 1000; let responseJson = null;
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          responseJson = await response.json();
          break;
        } catch (error) {
          if (i === retries - 1) throw error;
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }

      const text = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (text) {
        setAiAdvice(text);
      } else {
        setAiAdvice('アドバイスの取得に失敗しました。');
      }
    } catch (error) {
      console.error(error);
      setAiAdvice('エラーが発生しました。時間をおいてお試しください。');
    } finally {
      setIsAdvicing(false);
    }
  };

  const handleSelectSearchResult = async (item) => {
    setAutoCalcCal(false);
    setInputName(item.name);
    setInputCalories(item.calories?.toString() || '0'); 
    setInputProtein(item.protein?.toString() || '0');
    setInputFat(item.fat?.toString() || '0'); 
    setInputCarbs(item.carbs?.toString() || '0');
    
    const newMicros = {};
    Object.keys(currentMicrosConfig).forEach(key => {
      const val = (item.micros && item.micros[key] !== undefined) ? item.micros[key] : (item[key] || 0);
      newMicros[key] = val;
    });
    setInputMicros(newMicros);

    const cacheData = {
      name: item.name,
      calories: parseFloat(item.calories) || 0,
      protein: parseFloat(item.protein) || 0,
      fat: parseFloat(item.fat) || 0,
      carbs: parseFloat(item.carbs) || 0,
      micros: newMicros,
      timestamp: Date.now()
    };

    if (user) {
      try {
        const safeId = item.name.replace(/\//g, '_'); 
        await setDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'searchHistory'), safeId), cacheData);
      } catch (e) {
        console.error("Error saving search cache:", e);
      }
    }

    setBaseNutrition(cacheData);
    setCurrentScale(100);
    setCustomScaleInput('');
    setActiveInputTab('aiHistory');
    setSearchResults(null);
    showToast(`「${item.name}」の栄養素を取得しました`);
  };

  const handleAISearch = async (mode = 'fast') => {
    if (!inputName.trim()) {
      setSearchError('メニュー名を入力してください。');
      return;
    }
    
    const cachedItem = searchHistory.find(item => item.name === inputName);
    if (cachedItem) {
      applyPreset(cachedItem);
      setActiveInputTab('aiHistory');
      showToast(`キャッシュから「${inputName}」の栄養素を読み込みました`);
      return;
    }

    setIsSearching(true);
    setSearchMode(mode);
    setSearchError('');
    setSearchResults(null);
    
    if (mode === 'fast') {
      const lowerInput = inputName.toLowerCase().replace(/　/g, ' '); 
      const keywords = lowerInput.split(/\s+/).filter(kw => kw.length > 0);
      
      const localMatches = LOCAL_FOOD_DATABASE.filter(food => {
        const lowerName = food.name.toLowerCase();
        const aliases = food.aliases ? food.aliases.map(a => a.toLowerCase()) : [];
        return keywords.every(kw => 
          lowerName.includes(kw) || aliases.some(alias => alias.includes(kw))
        );
      });

      if (localMatches.length > 0) {
        setTimeout(() => {
          if (localMatches.length === 1) {
            handleSelectSearchResult(localMatches[0]);
          } else {
            setSearchResults(localMatches);
            showToast(`アプリ内データから候補が見つかりました ⚡️`);
          }
          setIsSearching(false);
          setSearchMode('');
        }, 300);
        return; 
      }
    }

    const apiKey = "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const microLabels = Object.values(currentMicrosConfig).map(m => `${m.label}(${m.unit})`).join(', ');
    
    const prompt = mode === 'detailed'
      ? `「${inputName}」の栄養素を検索してください。
信頼性の高い食品成分サイトを優先して検索・参照してください。
検索結果として、該当しそうな候補（グラム数違いや種類違いなど）を最大5件まで抽出し、JSONの配列（Array）形式で出力してください。
各候補は以下のプロパティを持つオブジェクトにしてください：
- name: 商品名や食品名と分量
- calories: カロリー(kcal)
- protein: タンパク質(g)
- fat: 脂質(g)
- carbs: 炭水化物(g)
${Object.keys(currentMicrosConfig).map(key => `- ${key}: ${currentMicrosConfig[key].label}(${currentMicrosConfig[key].unit})`).join('\n')}

該当しない微量栄養素や不明なものは0にしてください。`
      : `「${inputName}」の栄養素を推定してください。
日本食品標準成分表などの一般的な栄養データベースに関するあなたの知識に基づいて、該当しそうな候補を最大5件まで抽出し、JSONの配列形式で出力してください。
各候補は以下のプロパティを持つオブジェクトにしてください：
- name: 商品名や食品名と分量
- calories: カロリー(kcal)
- protein: タンパク質(g)
- fat: 脂質(g)
- carbs: 炭水化物(g)
${Object.keys(currentMicrosConfig).map(key => `- ${key}: ${currentMicrosConfig[key].label}(${currentMicrosConfig[key].unit})`).join('\n')}

該当しない微量栄養素や不明なものは0にしてください。`;

    const schemaProps = {
      name: { type: "STRING" },
      calories: { type: "NUMBER" }, protein: { type: "NUMBER" }, fat: { type: "NUMBER" }, carbs: { type: "NUMBER" }
    };
    Object.keys(currentMicrosConfig).forEach(key => schemaProps[key] = { type: "NUMBER" });

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: "application/json", 
        responseSchema: { 
          type: "ARRAY",
          items: { type: "OBJECT", properties: schemaProps }
        } 
      }
    };
    
    if (mode === 'detailed') {
      payload.tools = [{ google_search: {} }];
    }

    let retries = 5; let delay = 1000; let resultJSON = null;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { resultJSON = JSON.parse(text); break; } else throw new Error('No text in response');
      } catch (error) {
        console.warn(`Retry ${i + 1} failed:`, error);
        if (i === retries - 1) {
          setSearchError('AI検索に失敗しました。時間をおいて再度お試しください。');
          setIsSearching(false);
          setSearchMode('');
          return;
        }
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }

    if (resultJSON && Array.isArray(resultJSON) && resultJSON.length > 0) {
      if (resultJSON.length === 1) {
        handleSelectSearchResult(resultJSON[0]);
      } else {
        setSearchResults(resultJSON);
      }
    } else if (resultJSON && !Array.isArray(resultJSON)) {
       resultJSON.name = resultJSON.name || inputName;
       handleSelectSearchResult(resultJSON);
    } else {
      setSearchError('栄養素データが見つかりませんでした。');
    }
    setIsSearching(false);
    setSearchMode('');
  };

  const handleAddFavorite = async () => {
    if (!user || !inputName) return;
    
    const parsedMicros = {};
    Object.keys(currentMicrosConfig).forEach(key => parsedMicros[key] = parseFloat(inputMicros[key]) || 0);

    const newPreset = {
      name: inputName,
      calories: parseFloat(inputCalories) || 0, protein: parseFloat(inputProtein) || 0,
      fat: parseFloat(inputFat) || 0, carbs: parseFloat(inputCarbs) || 0,
      micros: parsedMicros,
      groupId: selectedGroupIdForSave // 保存先のグループIDを記録
    };
    
    try {
      // グループごとに別々のIDを生成し、重複登録を可能にする
      const safeId = `${inputName.replace(/\//g, '_')}_${selectedGroupIdForSave}`; 
      await setDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'presets'), safeId), newPreset);
      showToast(`${inputName} をお気に入りに保存しました`);
    } catch (error) {
      console.error("Error adding favorite:", error);
    }
  };

  const handleDeleteFavorite = async (e, item) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const oldSafeId = item.name.replace(/\//g, '_'); // 旧仕様データのID
      const currentSafeId = `${item.name.replace(/\//g, '_')}_${item.groupId || 'g1'}`; // 新仕様データのID
      
      await deleteDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'presets'), currentSafeId));
      await deleteDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'presets'), oldSafeId)); // 念のため旧データも削除試行
      showToast(`${item.name} をお気に入りから削除しました`);
    } catch (error) {
      console.error("Error deleting favorite:", error);
    }
  };

  const handleMoveFavorite = async (item, targetGroupId) => {
    if (!user) return;
    try {
      const oldSafeId = item.name.replace(/\//g, '_');
      const currentSafeId = `${item.name.replace(/\//g, '_')}_${item.groupId || 'g1'}`;
      const newSafeId = `${item.name.replace(/\//g, '_')}_${targetGroupId}`;

      const newItem = { ...item, groupId: targetGroupId };

      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'presets', newSafeId), newItem);
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'presets', currentSafeId));
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'presets', oldSafeId));
      
      showToast(`${item.name} を移動しました`);
      setMoveTargetItem(null);
    } catch (error) {
      console.error("Error moving favorite:", error);
    }
  };

  const handleDeleteSearchHistory = async (e, item) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const safeId = item.name.replace(/\//g, '_');
      await deleteDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'searchHistory'), safeId));
      showToast(`${item.name} をAI検索履歴から削除しました`);
    } catch (error) {
      console.error("Error deleting search history:", error);
    }
  };

  const handleAddMeal = async (e) => {
    e.preventDefault();
    if (!user || !inputName || (!inputCalories && inputCalories !== 0)) return;

    const now = new Date();
    const mealDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());

    const parsedMicros = {};
    Object.keys(currentMicrosConfig).forEach(key => parsedMicros[key] = parseFloat(inputMicros[key]) || 0);

    const newMeal = {
      type: inputType,
      name: inputName,
      calories: parseFloat(inputCalories) || 0, 
      protein: parseFloat(inputProtein) || 0,
      fat: parseFloat(inputFat) || 0, 
      carbs: parseFloat(inputCarbs) || 0,
      micros: parsedMicros,
      timestamp: mealDate.getTime(),
    };

    try {
      await setDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'meals'), Date.now().toString()), newMeal);
      
      showToast('記録を追加しました');
      setInputName(''); setInputProtein(''); setInputFat(''); setInputCarbs('');
      setInputMicros({});
      if (!autoCalcCal) setInputCalories('');
      setShowMicroDetails(false);
      setBaseNutrition(null);
      setCurrentScale(100);
      setCustomScaleInput('');
    } catch (error) {
      console.error("Error adding meal:", error);
    }
  };

  const handleDeleteMeal = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'meals'), id));
      showToast('記録を削除しました');
    } catch (error) {
      console.error("Error deleting meal:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (settingsTab === 'profile' && ((tempProfile.pfcTarget?.p || 0) + (tempProfile.pfcTarget?.f || 0) + (tempProfile.pfcTarget?.c || 0)) !== 100) {
      return;
    }
    try {
      const profileToSave = {
        gender: tempProfile.gender || 'male',
        age: tempProfile.age || 30,
        height: tempProfile.height || 170,
        weight: tempProfile.weight || 65,
        bodyFat: tempProfile.bodyFat || '',
        activityLevel: tempProfile.activityLevel || 'none',
        goal: tempProfile.goal || 'health',
        pfcTarget: tempProfile.pfcTarget || PFC_TARGET_RATIOS,
        favoriteGroups: tempProfile.favoriteGroups || defaultProfile.favoriteGroups
      };
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), profileToSave);
      showToast('設定を保存しました');
      setIsSettingsOpen(false);
    } catch (e) {
      console.error('Error saving profile:', e);
    }
  };

  const getPercent = (current, target) => Math.min(Math.round((current / target) * 100), 100);

  const groupedMeals = useMemo(() => {
    const groups = { breakfast: [], lunch: [], dinner: [], snack: [] };
    displayMeals.forEach(meal => {
      if (groups[meal.type]) groups[meal.type].push(meal);
    });
    return groups;
  }, [displayMeals]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-10 font-sans text-slate-800 relative">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-600">
            <PieChart className="w-6 h-6" />
            Nutri AI Tracker
          </h1>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center justify-between sm:justify-end gap-2 bg-gray-50 rounded-xl p-1 border border-gray-200 flex-1 sm:flex-none">
              <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)))} className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-indigo-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <div className="flex items-center gap-2 px-3 text-sm font-bold text-slate-700 min-w-[120px] justify-center">
                <Calendar className="w-4 h-4 text-indigo-500" />
                {isSameDay(currentDate, new Date()) ? '今日' : currentDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
              </div>
              <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)))} className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-indigo-600 transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
            
            <button 
              onClick={() => setIsSettingsOpen(true)} 
              className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-gray-50 transition-colors shadow-sm"
              title="設定・内蔵データ"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* サマリーセクション */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">サマリー</h2>
          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-slate-500 font-medium">摂取カロリー</span>
              <div className="text-right">
                <span className="text-3xl font-bold text-slate-800">{Math.round(totals.calories)}</span>
                <span className="text-slate-400 text-sm ml-1">/ {targets.calories} kcal</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${totals.calories > targets.calories ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${getPercent(totals.calories, targets.calories)}%` }}></div>
            </div>
          </div>

          {/* PFCバランス */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1">
              <PieChart className="w-4 h-4" /> PFCバランス
            </h3>
            <div className="flex w-full h-4 rounded-full overflow-hidden mb-3 bg-gray-200">
              <div className="bg-blue-500 transition-all duration-500" style={{width: `${pfcRatios.p}%`}}></div>
              <div className="bg-yellow-500 transition-all duration-500" style={{width: `${pfcRatios.f}%`}}></div>
              <div className="bg-green-500 transition-all duration-500" style={{width: `${pfcRatios.c}%`}}></div>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <div className="text-blue-700 flex flex-col items-center">
                <span>P <span className="text-xs font-medium bg-blue-100 px-1 py-0.5 rounded text-blue-800">{pfcRatios.p}%</span></span>
                <span className="text-[10px] text-gray-400 mt-0.5">目標 {currentPfcTarget.p}%</span>
              </div>
              <div className="text-yellow-700 flex flex-col items-center">
                <span>F <span className="text-xs font-medium bg-yellow-100 px-1 py-0.5 rounded text-yellow-800">{pfcRatios.f}%</span></span>
                <span className="text-[10px] text-gray-400 mt-0.5">目標 {currentPfcTarget.f}%</span>
              </div>
              <div className="text-green-700 flex flex-col items-center">
                <span>C <span className="text-xs font-medium bg-green-100 px-1 py-0.5 rounded text-green-800">{pfcRatios.c}%</span></span>
                <span className="text-[10px] text-gray-400 mt-0.5">目標 {currentPfcTarget.c}%</span>
              </div>
            </div>
          </div>

          {/* 主要6項目 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100/50">
              <div className="text-xs font-bold text-blue-600 mb-1">タンパク質</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-lg font-bold text-blue-900">{Math.round(totals.protein * 10) / 10}</span>
                <span className="text-[10px] text-blue-500">/ {targets.protein}g</span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${getPercent(totals.protein, targets.protein)}%` }}></div>
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100/50">
              <div className="text-xs font-bold text-yellow-600 mb-1">脂質</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-lg font-bold text-yellow-900">{Math.round(totals.fat * 10) / 10}</span>
                <span className="text-[10px] text-yellow-500">/ {targets.fat}g</span>
              </div>
              <div className="w-full bg-yellow-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${getPercent(totals.fat, targets.fat)}%` }}></div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-3 border border-green-100/50">
              <div className="text-xs font-bold text-green-600 mb-1">炭水化物</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-lg font-bold text-green-900">{Math.round(totals.carbs * 10) / 10}</span>
                <span className="text-[10px] text-green-500">/ {targets.carbs}g</span>
              </div>
              <div className="w-full bg-green-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: `${getPercent(totals.carbs, targets.carbs)}%` }}></div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-3 border border-purple-100/50">
              <div className="text-xs font-bold text-purple-600 mb-1">糖質</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-lg font-bold text-purple-900">{Math.round(totals.sugar * 10) / 10}</span>
                <span className="text-[10px] text-purple-500">/ {targets.sugar}g</span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${getPercent(totals.sugar, targets.sugar)}%` }}></div>
              </div>
            </div>

            <div className="bg-teal-50 rounded-xl p-3 border border-teal-100/50">
              <div className="text-xs font-bold text-teal-600 mb-1">食物繊維</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-lg font-bold text-teal-900">{Math.round((totals.micros.fiber || 0) * 10) / 10}</span>
                <span className="text-[10px] text-teal-500">/ {targets.fiber}g</span>
              </div>
              <div className="w-full bg-teal-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-teal-500 h-full rounded-full" style={{ width: `${getPercent(totals.micros.fiber || 0, targets.fiber)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-xs font-bold text-slate-600 mb-1">塩分</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-lg font-bold text-slate-900">{Math.round((totals.micros.salt || 0) * 10) / 10}</span>
                <span className="text-[10px] text-slate-500">/ {targets.salt}g</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${totals.micros.salt > targets.salt ? 'bg-red-500' : 'bg-slate-500'}`} style={{ width: `${getPercent(totals.micros.salt || 0, targets.salt)}%` }}></div>
              </div>
            </div>
          </div>

          {/* その他の微量栄養素 (折りたたみ) */}
          <div className="pt-2">
            <button 
              onClick={() => setShowSummaryMicros(!showSummaryMicros)}
              className="w-full py-3 flex justify-center items-center gap-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
            >
              {showSummaryMicros ? '全ての栄養素を閉じる' : '全ての栄養素を表示'}
              {showSummaryMicros ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showSummaryMicros && (
              <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in-up">
                <h3 className="text-sm font-bold mb-4 text-gray-700 flex items-center gap-2">微量栄養素など <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{userProfile.gender === 'male' ? '成人男性' : '成人女性'}の目安</span></h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(currentMicrosConfig).map(([key, config]) => {
                    if (key === 'salt' || key === 'fiber') return null;

                    const current = totals.micros[key] || 0;
                    const currentPercent = Math.min((current / config.maxDisplay) * 100, 100);
                    const recommendedPercent = config.recommended ? (config.recommended / config.maxDisplay) * 100 : 0;
                    const limitPercent = config.upperLimit ? (config.upperLimit / config.maxDisplay) * 100 : 0;
                    
                    let barColor = 'bg-orange-400';
                    if (config.upperLimit && current >= config.upperLimit) barColor = 'bg-red-500';
                    else if (config.recommended && current >= config.recommended) barColor = 'bg-emerald-500';
                    else if (!config.recommended && config.upperLimit && current < config.upperLimit) barColor = 'bg-emerald-500';
                    
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-gray-600">{config.label}</span>
                          <span className="font-medium text-slate-700">{Math.round(current * 10) / 10} {config.unit} <span className="text-gray-400 text-[10px] ml-2">({config.recommended ? `目安:${config.recommended}` : ''}{config.recommended && config.upperLimit ? ' / ' : ''}{config.upperLimit ? `上限:${config.upperLimit}` : ''})</span></span>
                        </div>
                        <div className="relative w-full bg-gray-100 rounded-full h-2.5 overflow-visible">
                          <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${barColor}`} style={{width: `${currentPercent}%`}}></div>
                          {config.recommended && <div className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-slate-800 z-10" style={{left: `${recommendedPercent}%`}}></div>}
                          {config.upperLimit && <div className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-red-600 z-10" style={{left: `${limitPercent}%`}}></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] text-gray-400 mt-2 flex gap-3">
                  <span className="flex items-center gap-1"><div className="w-1 h-3 bg-slate-800"></div> 目安量</span>
                  <span className="flex items-center gap-1"><div className="w-1 h-3 bg-red-600"></div> 上限量</span>
                </div>
              </div>
            )}
          </div>

          {/* ✨ AI食事アドバイス */}
          <div className="pt-4 mt-4 border-t border-gray-100">
             {!aiAdvice && !isAdvicing ? (
               <button 
                 onClick={handleGetAIAdvice}
                 className="w-full py-3 flex justify-center items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl transition-all shadow-sm"
               >
                 <Sparkles className="w-4 h-4 text-yellow-300" />
                 ✨ 今日の食事をAIに分析してもらう
               </button>
             ) : (
               <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 relative animate-fade-in-up">
                 <button 
                   onClick={() => setAiAdvice('')} 
                   className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-600"
                 >
                   <X className="w-4 h-4" />
                 </button>
                 <h3 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-1.5">
                   <Sparkles className="w-4 h-4 text-indigo-500" />
                   AI栄養士からのアドバイス
                 </h3>
                 {isAdvicing ? (
                   <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 py-4">
                     <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></div>
                     今日の記録を分析中...
                   </div>
                 ) : (
                   <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                     {aiAdvice}
                   </div>
                 )}
               </div>
             )}
          </div>
        </section>

        {/* 入力フォーム */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">食事を記録</h2>
          <form onSubmit={handleAddMeal} className="space-y-4">
            
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(MEAL_TYPES).map(([key, { label, icon: Icon, color }]) => (
                <button key={key} type="button" onClick={() => setInputType(key)} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${inputType === key ? `border-indigo-500 bg-indigo-50` : 'border-transparent bg-gray-50 hover:bg-gray-100 text-gray-500'}`}>
                  <Icon className={`w-6 h-6 mb-1 ${inputType === key ? color : 'text-gray-400'}`} />
                  <span className={`text-xs font-medium ${inputType === key ? 'text-indigo-700' : ''}`}>{label}</span>
                </button>
              ))}
            </div>

            {/* メニュー名と検索・タブ切り替えボタン */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium text-gray-700">メニュー名</label>
                <span className="text-[10px] text-gray-500">入力して下の候補を絞り込み</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text" required value={inputName} onChange={handleNameChange}
                  placeholder="例: マクドナルドのビッグマック"
                  className="w-full sm:flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                />
                
                {/* 検索・履歴アクションボタン群 */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button" onClick={() => handleAISearch('fast')} disabled={isSearching || !inputName}
                      className="flex-1 sm:flex-none bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 sm:px-3 sm:py-2.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap text-[10px] sm:text-sm"
                    >
                      {isSearching && searchMode === 'fast' ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-700 border-t-transparent"></div> : <Zap className="w-4 h-4" />}
                      <span>AI(高速)</span>
                    </button>
                    <button
                      type="button" onClick={() => handleAISearch('detailed')} disabled={isSearching || !inputName}
                      className="flex-1 sm:flex-none bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 sm:px-3 sm:py-2.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap text-[10px] sm:text-sm"
                    >
                      {isSearching && searchMode === 'detailed' ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-700 border-t-transparent"></div> : <Globe className="w-4 h-4" />}
                      <span>AI(詳細)</span>
                    </button>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button" onClick={() => setActiveInputTab('favorites')}
                      className={`flex-1 sm:flex-none p-2 sm:px-3 sm:py-2.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap text-[10px] sm:text-sm border ${activeInputTab === 'favorites' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Bookmark className="w-4 h-4" /> <span>お気に入り</span>
                    </button>
                    <button
                      type="button" onClick={() => setActiveInputTab('mealHistory')}
                      className={`flex-1 sm:flex-none p-2 sm:px-3 sm:py-2.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap text-[10px] sm:text-sm border ${activeInputTab === 'mealHistory' || activeInputTab === 'aiHistory' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Clock className="w-4 h-4" /> <span>履歴から</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {searchError && <div className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {searchError}</div>}

              {/* AI検索の複数候補表示エリア */}
              {searchResults && (
                <div className="mt-3 p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl shadow-sm animate-fade-up">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" /> 複数の候補が見つかりました。選択してください。
                    </h3>
                    <button type="button" onClick={() => setSearchResults(null)} className="text-indigo-400 hover:text-indigo-600 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="text-left px-4 py-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-400 hover:shadow-md transition-all group"
                      >
                        <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1.5 flex gap-x-4 gap-y-1 flex-wrap">
                          <span className="font-semibold text-slate-700">{item.calories} kcal</span>
                          <span className="text-blue-600">P: {item.protein}g</span>
                          <span className="text-yellow-600">F: {item.fat}g</span>
                          <span className="text-green-600">C: {item.carbs}g</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* タブ切り替えとリスト表示エリア */}
              <div className={`mt-3 p-3 rounded-xl border transition-colors ${isEditMode ? 'bg-red-50/50 border-red-200' : 'bg-gray-50/50 border-gray-100'}`}>
                {/* タブヘッダー */}
                <div className="flex border-b border-gray-200 mb-3 overflow-x-auto custom-scrollbar">
                  <button type="button" onClick={() => setActiveInputTab('favorites')} className={`whitespace-nowrap pb-2 px-3 text-xs font-bold flex items-center gap-1.5 ${activeInputTab === 'favorites' ? 'border-b-2 border-indigo-500 text-indigo-700' : 'text-gray-400 hover:text-gray-700'}`}>
                    <Bookmark className="w-3.5 h-3.5" /> お気に入り <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px] font-normal">{filteredFavorites.length}</span>
                  </button>
                  <button type="button" onClick={() => setActiveInputTab('mealHistory')} className={`whitespace-nowrap pb-2 px-3 text-xs font-bold flex items-center gap-1.5 ${activeInputTab === 'mealHistory' ? 'border-b-2 border-indigo-500 text-indigo-700' : 'text-gray-400 hover:text-gray-700'}`}>
                    <Clock className="w-3.5 h-3.5" /> 食事履歴 <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px] font-normal">{filteredMealHistory.length}</span>
                  </button>
                  <button type="button" onClick={() => setActiveInputTab('aiHistory')} className={`whitespace-nowrap pb-2 px-3 text-xs font-bold flex items-center gap-1.5 ${activeInputTab === 'aiHistory' ? 'border-b-2 border-indigo-500 text-indigo-700' : 'text-gray-400 hover:text-gray-700'}`}>
                    <Search className="w-3.5 h-3.5" /> AI検索履歴 <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px] font-normal">{filteredAiHistory.length}</span>
                  </button>
                </div>

                {/* お気に入りグループのサブタブ */}
                {activeInputTab === 'favorites' && favoriteGroups.length > 0 && (
                  <div className="flex gap-1.5 mb-3 overflow-x-auto custom-scrollbar pb-1">
                    <button 
                      type="button"
                      onClick={() => setActiveFavGroupFilter('all')} 
                      className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-colors ${activeFavGroupFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                    >
                      すべて
                    </button>
                    {favoriteGroups.map(g => (
                      <button 
                        key={g.id}
                        type="button"
                        onClick={() => setActiveFavGroupFilter(g.id)} 
                        className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-colors ${activeFavGroupFilter === g.id ? 'bg-indigo-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center mb-3 min-h-[28px]">
                  <label className={`text-xs font-bold flex items-center gap-1 ${isEditMode ? 'text-red-600' : 'text-gray-600'}`}>
                    {isEditMode ? '削除・移動する項目を選択してください' : 'タップして即座に記録する'}
                  </label>
                  {(activeInputTab === 'favorites' || activeInputTab === 'aiHistory') && (
                    <button 
                      type="button" onClick={() => setIsEditMode(!isEditMode)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${isEditMode ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-sm'}`}
                    >
                      {isEditMode ? '完了' : '整理する'}
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1 pb-1">
                  {(() => {
                    let list = [];
                    let icon = null;
                    let emptyMsg = '';
                    let isDeletable = false;
                    let deleteFn = null;

                    if (activeInputTab === 'favorites') {
                      list = filteredFavoritesByGroup;
                      icon = <Bookmark className="w-3 h-3 text-indigo-400" />;
                      emptyMsg = inputName ? '一致するお気に入りはありません。' : 'お気に入りはまだありません。入力を「お気に入り保存」すると追加されます。';
                      isDeletable = true;
                      deleteFn = handleDeleteFavorite;
                    } else if (activeInputTab === 'mealHistory') {
                      list = filteredMealHistory;
                      icon = <Clock className="w-3 h-3 text-emerald-500" />;
                      emptyMsg = inputName ? '一致する食事履歴はありません。' : '食事の記録がまだありません。';
                      isDeletable = false;
                    } else if (activeInputTab === 'aiHistory') {
                      list = filteredAiHistory;
                      icon = <Search className="w-3 h-3 text-blue-400" />;
                      emptyMsg = inputName ? '一致するAI検索履歴はありません。' : 'AI検索の履歴はまだありません。AI検索を行うと自動で保存されます。';
                      isDeletable = true;
                      deleteFn = handleDeleteSearchHistory;
                    }

                    if (list.length === 0) {
                      return (
                        <div className="text-xs text-gray-500 py-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                          {emptyMsg}
                        </div>
                      );
                    }

                    return list.map((food, index) => (
                      <div key={index} className="relative inline-block">
                        <button
                          type="button" 
                          onClick={(e) => {
                            if (isEditMode && isDeletable) {
                              // Editモード時は何もしない（ボタンのクリックに任せる）
                            } else {
                              handleDirectAddMeal(food);
                            }
                          }}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 shadow-sm ${
                            isEditMode && isDeletable
                              ? `bg-white text-gray-700 border-gray-300 ${activeInputTab === 'favorites' ? 'pr-16' : 'pr-8'}` // 移動ボタン分余白をとる
                              : 'bg-white hover:bg-indigo-50 text-gray-700 border-gray-200 hover:border-indigo-300'
                          }`}
                        >
                          {!isEditMode && icon}
                          {food.name}
                        </button>
                        
                        {isEditMode && isDeletable && (
                          <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                            {activeInputTab === 'favorites' && (
                              <div 
                                className="bg-blue-100 text-blue-600 rounded-full p-1 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
                                onClick={(e) => { e.stopPropagation(); setMoveTargetItem(food); }}
                                title="グループを移動"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                              </div>
                            )}
                            <div 
                              className="bg-red-100 text-red-600 rounded-full p-1 cursor-pointer hover:bg-red-600 hover:text-white transition-colors"
                              onClick={(e) => deleteFn(e, food)}
                              title="削除"
                            >
                              <X className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* お気に入り移動用のモーダル */}
            {moveTargetItem && (
              <div className="fixed inset-0 bg-black/40 z-40 flex justify-center items-center p-4 backdrop-blur-sm" onClick={() => setMoveTargetItem(null)}>
                <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2">
                    <Folder className="w-4 h-4 text-indigo-500" />
                    「{moveTargetItem.name}」を移動
                  </h3>
                  <div className="space-y-2">
                    {favoriteGroups.map(g => (
                      <button 
                        key={g.id} 
                        type="button"
                        onClick={() => handleMoveFavorite(moveTargetItem, g.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border font-medium text-sm transition-colors flex justify-between items-center ${moveTargetItem.groupId === g.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 text-gray-700'}`}
                      >
                        {g.name}
                        {moveTargetItem.groupId === g.id && <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">現在</span>}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setMoveTargetItem(null)} className="mt-4 w-full py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">キャンセル</button>
                </div>
              </div>
            )}

            {/* 分量調整 */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
              <label className="block text-xs font-bold text-indigo-800 mb-2">分量を調整</label>
              <div className="flex flex-wrap items-center gap-2">
                {[25, 50, 100, 150, 200, 300].map(pct => (
                  <button key={pct} type="button" onClick={() => handleScaleChange(pct)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${currentScale === pct ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}>
                    {pct}%
                  </button>
                ))}
                <div className={`flex items-center border rounded-lg overflow-hidden transition-colors bg-white ${![25, 50, 100, 150, 200, 300].includes(currentScale) && currentScale !== 100 ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-indigo-200'}`}>
                  <input type="number" className="w-16 text-xs px-2 py-1.5 outline-none bg-transparent text-indigo-800" placeholder="任意" value={customScaleInput} onChange={e => setCustomScaleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleScaleChange(parseFloat(customScaleInput)))} />
                  <button type="button" className="bg-indigo-100 px-2 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-200" onClick={() => handleScaleChange(parseFloat(customScaleInput))}>%反映</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-bold text-blue-600 mb-1">タンパク質 (g)</label><input type="number" min="0" step="any" value={inputProtein} onChange={handleManualInput(setInputProtein)} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" /></div>
              <div><label className="block text-xs font-bold text-yellow-600 mb-1">脂質 (g)</label><input type="number" min="0" step="any" value={inputFat} onChange={handleManualInput(setInputFat)} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none" placeholder="0" /></div>
              <div><label className="block text-xs font-bold text-green-600 mb-1">炭水化物 (g)</label><input type="number" min="0" step="any" value={inputCarbs} onChange={handleManualInput(setInputCarbs)} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" /></div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <button type="button" onClick={() => setShowMicroDetails(!showMicroDetails)} className="w-full px-4 py-3 flex justify-between items-center text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors">
                詳細な成分を入力 (任意) {showMicroDetails ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>
              {showMicroDetails && (
                <div className="p-4 bg-white grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto border-t border-gray-200 custom-scrollbar">
                  {Object.entries(currentMicrosConfig).map(([key, config]) => (
                    <div key={key}>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 truncate">{config.label} ({config.unit})</label>
                      <input type="number" min="0" step="any" value={inputMicros[key] !== undefined ? inputMicros[key] : ''} onChange={(e) => handleMicroChange(key, e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 text-sm border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-300" placeholder="0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">カロリー (kcal)</label>
                <label className="flex items-center text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={autoCalcCal} onChange={(e) => setAutoCalcCal(e.target.checked)} className="mr-1.5 rounded text-indigo-500" /> PFCから自動計算</label>
              </div>
              <input type="number" min="0" step="any" required disabled={autoCalcCal} value={inputCalories} onChange={handleManualInput(setInputCalories)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100" placeholder="0" />
              
              <div className="flex gap-2 items-end pt-2">
                <div className="w-1/3 flex flex-col gap-1.5">
                  <select 
                    value={selectedGroupIdForSave} 
                    onChange={e => setSelectedGroupIdForSave(e.target.value)}
                    className="w-full text-[10px] font-bold border border-indigo-200 text-indigo-700 bg-indigo-50/50 rounded-lg px-2 py-1 outline-none"
                  >
                    {favoriteGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <button type="button" onClick={handleAddFavorite} className="w-full bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition-colors text-sm shadow-sm">
                    <Bookmark className="w-4 h-4" /> <span className="hidden sm:inline">保存</span>
                  </button>
                </div>
                <button type="submit" className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm h-[58px]">
                  <Plus className="w-5 h-5" /> 記録する
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* 食事履歴リスト */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold px-1">記録</h2>
          {displayMeals.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">まだ記録がありません。</div>
          ) : (
            Object.entries(groupedMeals).map(([type, typeMeals]) => {
              if (typeMeals.length === 0) return null;
              const TypeIcon = MEAL_TYPES[type].icon;
              return (
                <div key={type} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className={`px-4 py-3 flex items-center gap-2 ${MEAL_TYPES[type].bgColor} border-b border-gray-100`}>
                    <TypeIcon className={`w-5 h-5 ${MEAL_TYPES[type].color}`} /><h3 className={`font-bold ${MEAL_TYPES[type].color}`}>{MEAL_TYPES[type].label}</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {typeMeals.map((meal) => {
                      const hasMicros = meal.micros && Object.values(meal.micros).some(val => val > 0);
                      return (
                      <div key={meal.id} className="p-4 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                        <div className="flex-1 pr-4">
                          <div className="font-medium text-slate-800">{meal.name}</div>
                          <div className="text-sm text-gray-500 mt-1 flex gap-3 flex-wrap">
                            <span className="font-semibold text-slate-600">{meal.calories} kcal</span><span className="text-blue-500">P:{meal.protein}g</span><span className="text-yellow-600">F:{meal.fat}g</span><span className="text-green-600">C:{meal.carbs}g</span>
                          </div>
                          {hasMicros && (
                            <div className="text-[10px] text-gray-400 mt-1.5 flex gap-2 flex-wrap">
                              {Object.entries(currentMicrosConfig).map(([key, config]) => meal.micros[key] > 0 ? <span key={key} className="bg-gray-100 px-1.5 py-0.5 rounded">{config.label}: {meal.micros[key]}{config.unit}</span> : null)}
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleDeleteMeal(meal.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"><Trash2 className="w-5 h-5" /></button>
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* 設定・内蔵データ確認モーダル */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-end sm:items-center p-0 sm:p-4 backdrop-blur-sm transition-all" onClick={() => setIsSettingsOpen(false)}>
          <div 
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in-up"
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダーとタブをまとめる */}
            <div className="flex-shrink-0 bg-white z-20 shadow-sm relative">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  設定
                </h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* モーダル内タブ */}
              <div className="flex border-b border-gray-200 bg-white px-2 sm:px-5 overflow-x-auto custom-scrollbar">
                <button 
                  onClick={() => setSettingsTab('profile')} 
                  className={`pb-3 pt-4 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 flex-1 justify-center transition-colors whitespace-nowrap ${settingsTab === 'profile' ? 'border-b-2 border-indigo-500 text-indigo-700' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  <User className="w-4 h-4" /> 目標設定
                </button>
                <button 
                  onClick={() => setSettingsTab('folders')} 
                  className={`pb-3 pt-4 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 flex-1 justify-center transition-colors whitespace-nowrap ${settingsTab === 'folders' ? 'border-b-2 border-indigo-500 text-indigo-700' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  <Folder className="w-4 h-4" /> グループ名設定
                </button>
                <button 
                  onClick={() => setSettingsTab('database')} 
                  className={`pb-3 pt-4 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 flex-1 justify-center transition-colors whitespace-nowrap ${settingsTab === 'database' ? 'border-b-2 border-indigo-500 text-indigo-700' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  <Database className="w-4 h-4" /> 内蔵データ
                </button>
              </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 bg-gray-50 relative">
              {settingsTab === 'profile' && (
                <div className="p-5 space-y-6">
                  <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm leading-relaxed border border-indigo-100">
                    身長や体重などの情報を入力することで、1日のメンテナンスカロリー（消費カロリー）を算出し、最適なPFCバランスを設定します。
                  </div>

                  {/* 基本情報フォーム */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2">基本情報</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">性別</label>
                        <select 
                          value={tempProfile.gender} onChange={e => setTempProfile({...tempProfile, gender: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value="male">男性</option>
                          <option value="female">女性</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">年齢</label>
                        <input 
                          type="number" min="0" value={tempProfile.age} onChange={e => setTempProfile({...tempProfile, age: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="歳"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">身長 (cm)</label>
                        <input 
                          type="number" min="0" step="any" value={tempProfile.height} onChange={e => setTempProfile({...tempProfile, height: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="170"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">体重 (kg)</label>
                        <input 
                          type="number" min="0" step="any" value={tempProfile.weight} onChange={e => setTempProfile({...tempProfile, weight: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="65"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">体脂肪率 (%) <span className="text-[10px] font-normal text-gray-400">※任意（より正確に計算）</span></label>
                      <input 
                        type="number" min="0" step="any" value={tempProfile.bodyFat} onChange={e => setTempProfile({...tempProfile, bodyFat: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="未入力でOK"
                      />
                    </div>
                  </div>

                  {/* 運動量フォーム */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-500" />
                      運動量から推定される消費カロリー
                    </h3>
                    <div className="grid gap-2">
                      {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTempProfile({...tempProfile, activityLevel: key})}
                          className={`text-left p-3 rounded-xl border-2 transition-all ${tempProfile.activityLevel === key ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-transparent bg-white shadow-sm hover:border-indigo-200'}`}
                        >
                          <div className={`font-bold text-sm ${tempProfile.activityLevel === key ? 'text-indigo-800' : 'text-slate-800'}`}>{level.label}</div>
                          <div className={`text-xs mt-1 ${tempProfile.activityLevel === key ? 'text-indigo-600' : 'text-gray-500'}`}>{level.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 目的とPFCバランス */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2 flex items-center gap-2 mt-4">
                      <Target className="w-4 h-4 text-pink-500" />
                      目的とPFCバランス
                    </h3>
                    <div className="grid gap-2">
                      {Object.entries(GOAL_PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setTempProfile({
                              ...tempProfile, 
                              goal: key, 
                              pfcTarget: key !== 'custom' ? { p: preset.p, f: preset.f, c: preset.c } : (tempProfile.pfcTarget || PFC_TARGET_RATIOS)
                            })
                          }}
                          className={`text-left p-3 rounded-xl border-2 transition-all ${tempProfile.goal === key ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-transparent bg-white shadow-sm hover:border-indigo-200'}`}
                        >
                          <div className="flex justify-between items-center">
                            <div className={`font-bold text-sm ${tempProfile.goal === key ? 'text-indigo-800' : 'text-slate-800'}`}>{preset.label}</div>
                            {key !== 'custom' && (
                              <div className="text-xs font-mono font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">P:{preset.p}% F:{preset.f}% C:{preset.c}%</div>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${tempProfile.goal === key ? 'text-indigo-600' : 'text-gray-500'}`}>{preset.description}</div>
                        </button>
                      ))}
                    </div>

                    {/* PFCカスタム入力エリア */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-gray-600">PFC割合を設定</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          ((tempProfile.pfcTarget?.p || 0) + (tempProfile.pfcTarget?.f || 0) + (tempProfile.pfcTarget?.c || 0)) === 100 
                            ? 'text-green-700 bg-green-100' 
                            : 'text-red-700 bg-red-100'
                        }`}>
                          合計: {((tempProfile.pfcTarget?.p || 0) + (tempProfile.pfcTarget?.f || 0) + (tempProfile.pfcTarget?.c || 0))}%
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {['p', 'f', 'c'].map(macro => (
                          <div key={macro} className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 text-center">
                              {macro === 'p' ? 'タンパク質' : macro === 'f' ? '脂質' : '炭水化物'}
                            </label>
                            <div className="relative">
                              <input 
                                type="number" min="0" max="100" 
                                value={tempProfile.pfcTarget?.[macro] || 0} 
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 0;
                                  setTempProfile({
                                    ...tempProfile,
                                    goal: 'custom',
                                    pfcTarget: { ...(tempProfile.pfcTarget || PFC_TARGET_RATIOS), [macro]: val }
                                  });
                                }}
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-center pr-5" 
                              />
                              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 font-medium">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 計算結果プレビューと保存 */}
                  <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm sticky bottom-0 z-10 mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-gray-600">あなたのメンテナンスカロリー</span>
                      <span className="text-2xl font-black text-indigo-700">
                        {(() => {
                          const w = parseFloat(tempProfile.weight)||0; const h = parseFloat(tempProfile.height)||0; const a = parseFloat(tempProfile.age)||0; const bf = parseFloat(tempProfile.bodyFat);
                          let bmr = 0;
                          if (w>0 && h>0 && a>0) {
                            if (!isNaN(bf) && bf > 0) bmr = 370 + (21.6 * (w * (1 - (bf/100))));
                            else bmr = (10 * w) + (6.25 * h) - (5 * a) + (tempProfile.gender === 'male' ? 5 : -161);
                          }
                          const multiplier = ACTIVITY_LEVELS[tempProfile.activityLevel]?.multiplier || 1.2;
                          return bmr > 0 ? Math.round(bmr * multiplier) : 0;
                        })()}
                        <span className="text-sm font-medium text-gray-500 ml-1">kcal</span>
                      </span>
                    </div>
                    {((tempProfile.pfcTarget?.p || 0) + (tempProfile.pfcTarget?.f || 0) + (tempProfile.pfcTarget?.c || 0)) !== 100 && (
                      <div className="text-xs text-red-500 mb-2 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> PFC割合の合計を100%にしてください。
                      </div>
                    )}
                    <button 
                      disabled={((tempProfile.pfcTarget?.p || 0) + (tempProfile.pfcTarget?.f || 0) + (tempProfile.pfcTarget?.c || 0)) !== 100}
                      onClick={handleSaveProfile}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors"
                    >
                      <Save className="w-5 h-5" /> 設定を保存して適用
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'folders' && (
                <div className="p-5 space-y-4">
                  <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm leading-relaxed border border-indigo-100">
                    お気に入りを整理するためのグループ（フォルダ）の名前を自由に変更できます。
                  </div>
                  <div className="space-y-4">
                    {tempProfile.favoriteGroups && tempProfile.favoriteGroups.map((g, idx) => (
                      <div key={g.id}>
                        <label className="block text-xs font-bold text-gray-600 mb-1">グループ {idx + 1}</label>
                        <input 
                          type="text" 
                          value={g.name} 
                          onChange={e => {
                            const newGroups = [...tempProfile.favoriteGroups];
                            newGroups[idx].name = e.target.value;
                            setTempProfile({...tempProfile, favoriteGroups: newGroups});
                          }}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700" 
                        />
                      </div>
                    ))}
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm sticky bottom-0 z-10 mt-6">
                    <button 
                      onClick={handleSaveProfile}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors"
                    >
                      <Save className="w-5 h-5" /> グループ名を保存
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'database' && (
                <div className="p-5">
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    「AI(高速)」で検索した際、API通信を行わずに即座に読み込まれる基本データのリスト（{LOCAL_FOOD_DATABASE.length}件）です。タップすると詳細な栄養素を確認できます。
                  </p>
                  <div className="space-y-2.5">
                    {LOCAL_FOOD_DATABASE.map((food, idx) => (
                      <div 
                        key={idx} 
                        className="p-3.5 border border-gray-200 rounded-xl bg-white shadow-sm hover:border-indigo-200 transition-colors cursor-pointer"
                        onClick={() => setExpandedFoodIdx(expandedFoodIdx === idx ? null : idx)}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="font-bold text-sm text-slate-800">{food.name}</div>
                          {expandedFoodIdx === idx ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                          <span className="font-semibold text-slate-700">{food.calories} kcal</span>
                          <span className="text-blue-600">P:{food.protein}g</span>
                          <span className="text-yellow-600">F:{food.fat}g</span>
                          <span className="text-green-600">C:{food.carbs}g</span>
                        </div>
                        
                        {/* 詳細表示エリア（アコーディオン） */}
                        {expandedFoodIdx === idx && (
                          <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in-up">
                            <h4 className="text-[10px] font-bold text-gray-500 mb-2">微量栄養素</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(food.micros).map(([key, val]) => {
                                if (!val || !currentMicrosConfig[key]) return null;
                                return (
                                  <span key={key} className="text-[10px] bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-200">
                                    {currentMicrosConfig[key].label}: {val}{currentMicrosConfig[key].unit}
                                  </span>
                                );
                              })}
                              {Object.keys(food.micros).length === 0 && (
                                <span className="text-[10px] text-gray-400">詳細データがありません</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl z-50 animate-toast whitespace-nowrap flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />{toastMessage}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        @keyframes toastFade { from { opacity: 0; transform: translate(-50%, 15px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-toast { animation: toastFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}
ximport React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Utensils, Coffee, Sun, Moon, PieChart, Sparkles, Bookmark, AlertCircle, ChevronLeft, ChevronRight, Calendar, ChevronDown, ChevronUp, X, Clock, Search, Zap, Globe, Settings, Database, User, Activity, Save, Target, Folder, ArrowRightLeft, Monitor, Home } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';

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
const appId = "mydietapp-98c1e";

const DEFAULT_TARGETS = { calories: 2000, protein: 100, fat: 44, carbs: 300 };
const PFC_TARGET_RATIOS = { p: 20, f: 20, c: 60 };

const GOAL_PRESETS = {
  health: { label: '健康維持', p: 20, f: 20, c: 60, description: 'バランスの良い標準的な食事' },
  diet: { label: 'ダイエット', p: 30, f: 20, c: 50, description: '糖質・脂質を抑え、タンパク質を多めに' },
  muscle: { label: '筋肉を付ける', p: 30, f: 25, c: 45, description: '筋肉の合成とエネルギー補給を重視' },
  custom: { label: 'カスタム', p: 0, f: 0, c: 0, description: '自分でPFC割合を自由に設定' },
};

const ACTIVITY_LEVELS = {
  none: { label: '考慮しない', multiplier: 1.2, description: '運動はほぼしない' },
  light: { label: '軽い運動', multiplier: 1.375, description: '週1〜2回の運動や立ち仕事' },
  moderate: { label: '中程度の運動', multiplier: 1.55, description: '週3〜5回の運動や筋トレ' },
  active: { label: '激しい運動', multiplier: 1.725, description: '週6〜7回の激しい運動' },
  veryActive: { label: '非常に激しい運動', multiplier: 1.9, description: '毎日の過酷な運動、肉体労働' },
};

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
  breakfast: { label: '朝食', icon: Sun, color: 'text-orange-500', bgColor: 'bg-orange-100', darkBgColor: 'bg-orange-900/30' },
  lunch: { label: '昼食', icon: Utensils, color: 'text-yellow-500', bgColor: 'bg-yellow-100', darkBgColor: 'bg-yellow-900/30' },
  dinner: { label: '夕食', icon: Moon, color: 'text-indigo-500', bgColor: 'bg-indigo-100', darkBgColor: 'bg-indigo-900/30' },
  snack: { label: '間食', icon: Coffee, color: 'text-pink-500', bgColor: 'bg-pink-100', darkBgColor: 'bg-pink-900/30' },
};

// --- フルデータベース（180件以上） ---
const LOCAL_FOOD_DATABASE = [
  // === 主食・穀類 ===
  {name:'白米 (150g・茶碗1杯)',aliases:['ごはん','ご飯','こめ'],calories:234,protein:3.8,fat:0.5,carbs:55.7,micros:{fiber:0.5,salt:0,zinc:0.9,iron:0.2,potassium:44,magnesium:11,phosphorus:51}},
  {name:'ごはん180g',aliases:['白米','ご飯','こめ','ライス'],calories:281,protein:4.5,fat:0.5,carbs:66.8,micros:{fiber:0.5,salt:0,zinc:1.1,iron:0.2,potassium:52,magnesium:13}},
  {name:'玄米 (150g)',aliases:['げんまい'],calories:228,protein:4.2,fat:1.5,carbs:51.3,micros:{fiber:2.1,salt:0,iron:0.6,magnesium:74,potassium:140}},
  {name:'もち麦ごはん (150g)',aliases:['麦ごはん'],calories:215,protein:4.1,fat:0.7,carbs:49.0,micros:{fiber:3.5,salt:0,iron:0.5,magnesium:25}},
  {name:'赤飯 (180g)',aliases:['せきはん'],calories:340,protein:7.5,fat:1.5,carbs:72.0,micros:{fiber:2.5,salt:1.0,iron:0.9,potassium:160,magnesium:30}},
  {name:'炊き込みご飯 (150g)',aliases:['かやくごはん'],calories:250,protein:5.0,fat:2.0,carbs:50.0,micros:{fiber:1.2,salt:1.5,iron:0.5,potassium:120}},
  {name:'おかゆ (全粥 250g)',aliases:['お粥'],calories:178,protein:2.3,fat:0.3,carbs:39.5,micros:{fiber:0.3,salt:0.5,potassium:30}},
  {name:'おにぎり 鮭 (1個 100g)',aliases:['おむすび','しゃけ'],calories:170,protein:4.5,fat:1.0,carbs:35.0,micros:{salt:1.2,iron:0.2,vitaminD:1.5}},
  {name:'おにぎり ツナマヨ (1個 100g)',aliases:['おむすび'],calories:210,protein:4.0,fat:6.5,carbs:34.0,micros:{salt:1.0,iron:0.3}},
  {name:'おにぎり 昆布 (1個 100g)',aliases:['おむすび'],calories:165,protein:3.0,fat:0.5,carbs:36.0,micros:{salt:1.1,fiber:0.8}},
  {name:'おにぎり 梅 (1個 100g)',aliases:['おむすび','梅干し'],calories:160,protein:2.5,fat:0.3,carbs:36.0,micros:{salt:1.5,fiber:0.4}},
  {name:'おにぎり 明太子 (1個 100g)',aliases:['おむすび'],calories:168,protein:4.2,fat:0.8,carbs:35.5,micros:{salt:1.4,iron:0.3}},
  {name:'食パン (6枚切り 1枚)',aliases:['パン'],calories:149,protein:5.3,fat:2.5,carbs:28.0,micros:{fiber:1.4,salt:0.8,calcium:15}},
  {name:'食パン (8枚切り 1枚)',aliases:['パン'],calories:124,protein:4.4,fat:2.1,carbs:23.3,micros:{fiber:1.2,salt:0.6,calcium:12}},
  {name:'全粒粉パン (1枚)',aliases:['パン'],calories:140,protein:6.0,fat:2.8,carbs:25.0,micros:{fiber:3.0,salt:0.7,iron:1.2}},
  {name:'ピザトースト (1枚)',aliases:['パン'],calories:250,protein:9.0,fat:10.0,carbs:30.0,micros:{fiber:2.0,salt:1.5,calcium:100}},
  {name:'クロワッサン (1個 40g)',aliases:['パン'],calories:179,protein:3.2,fat:10.7,carbs:17.5,micros:{salt:0.4,saturatedFat:6.0}},
  {name:'バターロール (1個 30g)',aliases:['パン'],calories:95,protein:2.8,fat:2.7,carbs:15.0,micros:{salt:0.3,saturatedFat:1.2}},
  {name:'フランスパン (1切れ 30g)',aliases:['バゲット'],calories:84,protein:2.8,fat:0.4,carbs:17.3,micros:{salt:0.4}},
  {name:'ベーグル (1個 90g)',aliases:['パン'],calories:240,protein:8.5,fat:1.0,carbs:48.0,micros:{salt:1.0,iron:0.8}},
  {name:'うどん (ゆで 1玉 200g)',aliases:['饂飩'],calories:210,protein:5.2,fat:0.8,carbs:43.2,micros:{salt:0.6,fiber:1.0}},
  {name:'そば (ゆで 1玉 150g)',aliases:['蕎麦'],calories:198,protein:7.2,fat:1.5,carbs:39.0,micros:{salt:0,fiber:2.3,iron:1.2}},
  {name:'ざるそば (1人前)',aliases:['蕎麦'],calories:280,protein:10.0,fat:1.5,carbs:55.0,micros:{salt:1.5,fiber:3.0}},
  {name:'そうめん (乾麺 1束 50g)',aliases:['素麺'],calories:178,protein:4.8,fat:0.6,carbs:36.6,micros:{salt:2.8}},
  {name:'パスタ (乾麺 100g)',aliases:['スパゲティ'],calories:378,protein:13.0,fat:2.0,carbs:73.0,micros:{fiber:5.4,iron:1.4}},
  {name:'ナポリタン (1人前)',aliases:['パスタ'],calories:600,protein:15.0,fat:20.0,carbs:85.0,micros:{salt:3.5,fiber:6.0}},
  {name:'ミートソースパスタ (1人前)',aliases:['パスタ'],calories:650,protein:20.0,fat:22.0,carbs:85.0,micros:{salt:3.5,iron:3.5}},
  {name:'カルボナーラ (1人前)',aliases:['パスタ'],calories:740,protein:22.0,fat:35.0,carbs:80.0,micros:{salt:3.2,calcium:150}},
  {name:'ペペロンチーノ (1人前)',aliases:['パスタ'],calories:550,protein:14.0,fat:25.0,carbs:70.0,micros:{salt:2.8}},
  {name:'中華麺 / ラーメン (生 1玉 120g)',aliases:['らーめん'],calories:337,protein:10.3,fat:1.9,carbs:67.2,micros:{salt:0.2}},
  {name:'焼きそば (1人前)',aliases:['やきそば'],calories:500,protein:15.0,fat:18.0,carbs:65.0,micros:{salt:3.5,fiber:4.0}},
  {name:'オートミール (1食 30g)',aliases:[],calories:114,protein:4.1,fat:1.7,carbs:20.7,micros:{fiber:2.8,iron:1.2}},
  {name:'グラノーラ (1食 50g)',aliases:['シリアル'],calories:220,protein:4.0,fat:7.5,carbs:35.0,micros:{fiber:4.5,iron:2.0}},
  {name:'コーンフレーク (1食 40g)',aliases:['シリアル'],calories:152,protein:2.6,fat:0.4,carbs:34.5,micros:{iron:1.5}},
  {name:'餅 / もち (1個 50g)',aliases:['お餅'],calories:112,protein:2.1,fat:0.4,carbs:25.2,micros:{salt:0}},

  // === 肉類 ===
  {name:'鶏むね肉 皮なし (生 100g)',aliases:['鶏むね'],calories:108,protein:22.3,fat:1.5,carbs:0,micros:{salt:0.1,potassium:350,iron:0.3}},
  {name:'鶏むね肉 皮あり (生 100g)',aliases:['鶏むね'],calories:191,protein:19.5,fat:11.6,carbs:0,micros:{salt:0.1,potassium:300}},
  {name:'鶏むね肉（蒸し）100g',aliases:['蒸し鶏'],calories:105,protein:23.0,fat:1.0,carbs:0.1,micros:{salt:0.2,potassium:340}},
  {name:'サラダチキン (1パック 110g)',aliases:['サラチキ'],calories:110,protein:24.0,fat:1.5,carbs:0.5,micros:{salt:1.2}},
  {name:'唐揚げ (1個 30g)',aliases:['からあげ'],calories:80,protein:4.0,fat:6.0,carbs:3.0,micros:{salt:0.3}},
  {name:'焼き鳥 もも塩 (1本)',aliases:['やきとり'],calories:90,protein:9.0,fat:6.0,carbs:0.1,micros:{salt:0.8}},
  {name:'焼き鳥 ももタレ (1本)',aliases:['やきとり'],calories:110,protein:8.5,fat:5.5,carbs:5.0,micros:{salt:1.2}},
  {name:'鶏もも肉 皮なし (生 100g)',aliases:['鶏もも'],calories:116,protein:18.8,fat:3.9,carbs:0,micros:{salt:0.1,potassium:300}},
  {name:'鶏もも肉 皮あり (生 100g)',aliases:['鶏もも'],calories:200,protein:16.2,fat:14.0,carbs:0,micros:{salt:0.1}},
  {name:'鶏手羽先 (生 100g)',aliases:['手羽先'],calories:211,protein:17.4,fat:15.2,carbs:0,micros:{salt:0.1}},
  {name:'鶏手羽元 (生 100g)',aliases:['手羽元'],calories:197,protein:18.2,fat:12.8,carbs:0,micros:{salt:0.1}},
  {name:'鶏ささみ (生 100g)',aliases:['ささみ'],calories:105,protein:23.0,fat:0.8,carbs:0,micros:{salt:0.1,protein:23.0}},
  {name:'鶏レバー (生 100g)',aliases:['レバー'],calories:111,protein:18.9,fat:3.1,carbs:0.6,micros:{iron:9.0,vitaminA:14000}},
  {name:'鶏砂肝 (生 100g)',aliases:['すなぎも'],calories:94,protein:18.3,fat:1.8,carbs:0,micros:{iron:2.5}},
  {name:'豚ロース 赤身 (生 100g)',aliases:['豚肉'],calories:140,protein:22.7,fat:4.8,carbs:0.2,micros:{vitaminB1:0.9,salt:0.1}},
  {name:'豚ロース 脂身あり (生 100g)',aliases:['豚肉'],calories:263,protein:19.3,fat:19.2,carbs:0.2,micros:{vitaminB1:0.7}},
  {name:'豚バラ肉 (生 100g)',aliases:['豚バラ'],calories:386,protein:14.2,fat:34.6,carbs:0.1,micros:{vitaminB1:0.5}},
  {name:'豚ヒレ (生 100g)',aliases:['ひれ肉'],calories:115,protein:22.8,fat:1.9,carbs:0.2,micros:{vitaminB1:1.0,iron:0.8}},
  {name:'豚トロ (生 100g)',aliases:['とんとろ'],calories:392,protein:14.3,fat:35.4,carbs:0.1,micros:{vitaminB1:0.4}},
  {name:'豚もも肉 赤身 (生 100g)',aliases:['豚肉'],calories:128,protein:22.1,fat:3.6,carbs:0.2,micros:{vitaminB1:0.9}},
  {name:'とんかつ (1枚 約100g)',aliases:['豚かつ'],calories:340,protein:15.0,fat:25.0,carbs:10.0,micros:{salt:0.8}},
  {name:'牛もも肉 (生 100g)',aliases:['牛肉'],calories:182,protein:21.2,fat:9.6,carbs:0.5,micros:{iron:2.8,zinc:4.5}},
  {name:'牛サーロイン (生 100g)',aliases:['ステーキ'],calories:298,protein:17.4,fat:23.7,carbs:0.4,micros:{iron:1.5}},
  {name:'牛タン (生 100g)',aliases:['ぎゅうたん'],calories:269,protein:15.2,fat:21.7,carbs:0.1,micros:{iron:2.0}},
  {name:'牛ハラミ (生 100g)',aliases:['はらみ'],calories:344,protein:14.8,fat:30.0,carbs:0.2,micros:{iron:2.2}},
  {name:'牛バラ肉 (生 100g)',aliases:['牛バラ','カルビ'],calories:371,protein:14.4,fat:32.9,carbs:0.2,micros:{iron:1.4}},
  {name:'ハンバーグ (1個 約100g)',aliases:[],calories:220,protein:13.0,fat:14.0,carbs:9.0,micros:{salt:1.0,iron:1.2}},
  {name:'ウインナー (1本 15g)',aliases:['ソーセージ'],calories:48,protein:2.0,fat:4.1,carbs:0.5,micros:{salt:0.3}},
  {name:'ロースハム (1枚 15g)',aliases:['ハム'],calories:17,protein:2.5,fat:0.5,carbs:0.3,micros:{salt:0.4}},
  {name:'ベーコン (1枚 15g)',aliases:[],calories:61,protein:1.9,fat:5.9,carbs:0.1,micros:{salt:0.3}},
  {name:'生ハム (1枚 10g)',aliases:['ハム'],calories:25,protein:2.4,fat:1.5,carbs:0.1,micros:{salt:0.6}},

  // === 魚介類 ===
  {name:'焼き鮭 100g',aliases:['焼きしゃけ'],calories:140,protein:22.5,fat:4.8,carbs:0.1,micros:{vitaminD:30,salt:1.5,iron:0.4}},
  {name:'鮭 / さけ (生 100g)',aliases:['サーモン'],calories:133,protein:22.3,fat:4.5,carbs:0.1,micros:{vitaminD:32,n3Fat:1.2}},
  {name:'さば (生 100g)',aliases:['鯖'],calories:247,protein:20.6,fat:16.8,carbs:0.3,micros:{vitaminD:5.1,n3Fat:2.1}},
  {name:'さばの塩焼き (1切れ 80g)',aliases:['鯖'],calories:220,protein:18.0,fat:15.0,carbs:0.2,micros:{salt:1.0}},
  {name:'さばの味噌煮 (1切れ)',aliases:['鯖'],calories:260,protein:17.0,fat:16.0,carbs:10.0,micros:{salt:1.5}},
  {name:'ブリ (生 100g)',aliases:['ハマチ'],calories:257,protein:21.4,fat:17.6,carbs:0.3,micros:{n3Fat:1.8}},
  {name:'カツオ (生 100g)',aliases:['鰹'],calories:114,protein:25.8,fat:0.5,carbs:0.1,micros:{iron:1.9}},
  {name:'マグロ 赤身 (生 100g)',aliases:['まぐろ'],calories:125,protein:26.4,fat:1.4,carbs:0.1,micros:{iron:1.2}},
  {name:'マグロ トロ (生 100g)',aliases:['まぐろ'],calories:344,protein:20.1,fat:27.5,carbs:0.1,micros:{iron:1.0}},
  {name:'タイ (生 100g)',aliases:['鯛'],calories:129,protein:20.6,fat:5.8,carbs:0.1,micros:{vitaminD:1.5}},
  {name:'ヒラメ (生 100g)',aliases:['平目'],calories:103,protein:20.0,fat:2.0,carbs:0.1,micros:{vitaminD:2.0}},
  {name:'サンマ (生 100g)',aliases:['秋刀魚'],calories:310,protein:18.5,fat:24.6,carbs:0.1,micros:{iron:1.4}},
  {name:'アジの開き (1尾 80g)',aliases:['アジ'],calories:120,protein:16.0,fat:5.5,carbs:0.1,micros:{salt:1.2}},
  {name:'ししゃも (3尾 45g)',aliases:['シシャモ'],calories:80,protein:7.0,fat:5.5,carbs:0.2,micros:{calcium:150,salt:0.7}},
  {name:'タラコ (1腹 40g)',aliases:[],calories:56,protein:9.6,fat:1.9,carbs:0.2,micros:{salt:1.8}},
  {name:'明太子 (1腹 40g)',aliases:[],calories:50,protein:8.4,fat:1.3,carbs:1.2,micros:{salt:2.2}},
  {name:'イクラ (大さじ1 15g)',aliases:[],calories:40,protein:4.8,fat:2.4,carbs:0.1,micros:{salt:0.3}},
  {name:'カニ (むき身 50g)',aliases:['蟹'],calories:35,protein:7.5,fat:0.2,carbs:0.1,micros:{zinc:1.5}},
  {name:'タコ (ゆで 50g)',aliases:['蛸'],calories:38,protein:8.2,fat:0.4,carbs:0.1,micros:{zinc:0.8}},
  {name:'イカ (生 50g)',aliases:['いか'],calories:44,protein:9.0,fat:0.6,carbs:0.1,micros:{zinc:0.7}},
  {name:'カキ (生 50g)',aliases:['牡蠣'],calories:30,protein:3.3,fat:0.7,carbs:2.4,micros:{zinc:7.0,iron:1.0}},
  {name:'ホタテ (生 50g)',aliases:['帆立'],calories:41,protein:8.5,fat:0.5,carbs:0.8,micros:{zinc:1.0}},
  {name:'エビ (生 50g)',aliases:['えび'],calories:41,protein:9.8,fat:0.3,carbs:0,micros:{calcium:30}},
  {name:'ちりめんじゃこ大さじ1',aliases:['じゃこ','しらす'],calories:10,protein:2.0,fat:0.2,carbs:0.0,micros:{calcium:26,salt:0.3}},
  {name:'エビフライ (1尾)',aliases:['海老フライ'],calories:120,protein:5.0,fat:7.0,carbs:8.0,micros:{salt:0.4}},
  {name:'エビチリ (1人前)',aliases:[],calories:250,protein:14.0,fat:12.0,carbs:18.0,micros:{salt:2.0}},
  {name:'ツナ缶 水煮 (1缶 70g)',aliases:['シーチキン'],calories:50,protein:11.2,fat:0.5,carbs:0.1,micros:{salt:0.5}},
  {name:'ツナ缶 油漬け (1缶 70g)',aliases:['シーチキン'],calories:186,protein:11.0,fat:15.5,carbs:0.1,micros:{salt:0.5}},
  {name:'かまぼこ (1切れ 15g)',aliases:['蒲鉾'],calories:14,protein:1.8,fat:0.1,carbs:1.5,micros:{salt:0.3}},
  {name:'ちくわ (1本 30g)',aliases:['竹輪'],calories:36,protein:3.7,fat:0.6,carbs:4.0,micros:{salt:0.6}},

  // === 大豆・卵・乳製品 ===
  {name:'卵 (1個 50g)',aliases:['たまご','玉子'],calories:71,protein:6.1,fat:5.2,carbs:0.2,micros:{cholesterol:210,vitaminD:0.9,iron:0.9,salt:0.1}},
  {name:'ゆで卵 (1個 50g)',aliases:['ゆでたまご'],calories:67,protein:6.5,fat:4.3,carbs:0.2,micros:{cholesterol:210,vitaminD:0.9,iron:0.9}},
  {name:'卵焼き (卵1個分)',aliases:['たまごやき'],calories:85,protein:6.5,fat:5.5,carbs:1.0,micros:{salt:0.4}},
  {name:'目玉焼き (卵1個分)',aliases:['めだまやき'],calories:80,protein:6.3,fat:5.5,carbs:0.5,micros:{salt:0.5}},
  {name:'オムレツ (卵2個分)',aliases:['たまご'],calories:200,protein:13.0,fat:15.0,carbs:2.0,micros:{salt:0.8}},
  {name:'スクランブルエッグ (卵2個)',aliases:['たまご'],calories:180,protein:12.0,fat:13.0,carbs:1.5,micros:{salt:0.8}},
  {name:'納豆 (1パック 50g)',aliases:['なっとう'],calories:96,protein:8.3,fat:4.8,carbs:6.0,micros:{fiber:3.4,iron:1.6,salt:0.6}},
  {name:'冷ややっこ (100g)',aliases:['豆腐'],calories:56,protein:5.0,fat:3.0,carbs:1.7,micros:{calcium:43,iron:0.8}},
  {name:'木綿豆腐 (150g)',aliases:['とうふ'],calories:108,protein:9.9,fat:6.3,carbs:2.4,micros:{calcium:135,iron:1.4}},
  {name:'絹ごし豆腐 (150g)',aliases:['とうふ'],calories:84,protein:7.5,fat:4.5,carbs:2.6,micros:{calcium:65,iron:1.2}},
  {name:'厚揚げ (75g)',aliases:['あつあげ'],calories:113,protein:8.0,fat:8.5,carbs:0.7,micros:{calcium:180,iron:1.9}},
  {name:'油揚げ (1枚 30g)',aliases:['あぶらあげ'],calories:116,protein:5.6,fat:10.3,carbs:0.2,micros:{calcium:90}},
  {name:'豆乳 調製 (200ml)',aliases:['とうにゅう'],calories:128,protein:6.4,fat:7.2,carbs:9.4,micros:{iron:2.4}},
  {name:'豆乳 無調製 (200ml)',aliases:['とうにゅう'],calories:92,protein:7.2,fat:4.0,carbs:6.2,micros:{iron:2.4}},
  {name:'牛乳 (200ml)',aliases:['ミルク'],calories:134,protein:6.6,fat:7.6,carbs:9.6,micros:{calcium:220}},
  {name:'低脂肪乳 (200ml)',aliases:['ミルク'],calories:92,protein:7.6,fat:2.0,carbs:11.0,micros:{calcium:260}},
  {name:'ヨーグルト (100g)',aliases:[],calories:62,protein:3.6,fat:3.0,carbs:4.9,micros:{calcium:120}},
  {name:'ヨーグルト 低脂肪 (100g)',aliases:[],calories:45,protein:4.3,fat:1.0,carbs:5.0,micros:{calcium:130}},
  {name:'スライスチーズ (1枚 18g)',aliases:['ちーず'],calories:61,protein:4.1,fat:4.7,carbs:0.3,micros:{calcium:113,salt:0.5}},
  {name:'カマンベールチーズ (20g)',aliases:['ちーず'],calories:62,protein:3.8,fat:4.9,carbs:0.2,micros:{calcium:92,salt:0.4}},

  // === 野菜・果物 ===
  {name:'キャベツの千切り (60g)',aliases:['きゃべつ'],calories:14,protein:0.8,fat:0.1,carbs:3.1,micros:{vitaminC:24,fiber:1.1}},
  {name:'ブロッコリー (15g)',aliases:['ぶろっこりー'],calories:5,protein:0.7,fat:0.1,carbs:0.7,micros:{vitaminC:9,fiber:0.6}},
  {name:'トマト (1個 150g)',aliases:['とまと'],calories:29,protein:1.1,fat:0.2,carbs:7.1,micros:{vitaminC:23,potassium:320,fiber:1.5}},
  {name:'ミニトマト (5個 50g)',aliases:['とまと'],calories:15,protein:0.5,fat:0.1,carbs:3.6,micros:{vitaminC:16,fiber:0.7}},
  {name:'白菜 (100g)',aliases:['はくさい'],calories:14,protein:0.8,fat:0.1,carbs:3.2,micros:{fiber:1.3,vitaminC:19}},
  {name:'ネギ (100g)',aliases:['長葱'],calories:28,protein:1.4,fat:0.1,carbs:6.1,micros:{fiber:2.2,vitaminC:14}},
  {name:'ニラ (100g)',aliases:['にら'],calories:21,protein:1.7,fat:0.3,carbs:3.3,micros:{fiber:2.7,vitaminC:19}},
  {name:'ピーマン (1個 30g)',aliases:['ぴーまん'],calories:6,protein:0.3,fat:0.1,carbs:1.5,micros:{vitaminC:23,fiber:0.7}},
  {name:'ナス (1本 80g)',aliases:['茄子'],calories:18,protein:0.9,fat:0.1,carbs:4.1,micros:{fiber:1.8}},
  {name:'オクラ (50g)',aliases:['おくら'],calories:15,protein:1.0,fat:0.1,carbs:3.3,micros:{fiber:2.5}},
  {name:'きゅうり (1本 100g)',aliases:['胡瓜'],calories:14,protein:1.0,fat:0.1,carbs:3.0,micros:{fiber:1.1,potassium:200}},
  {name:'とろろ (50g)',aliases:['山芋'],calories:32,protein:1.0,fat:0.1,carbs:7.0,micros:{fiber:0.5}},
  {name:'大根おろし (50g)',aliases:['だいこん'],calories:9,protein:0.2,fat:0.1,carbs:2.0,micros:{vitaminC:6,fiber:0.7}},
  {name:'枝豆 (さや付 100g)',aliases:['えだまめ'],calories:135,protein:11.7,fat:6.2,carbs:8.8,micros:{fiber:5.0,vitaminC:27}},
  {name:'おひたし ほうれん草 (1小鉢)',aliases:[],calories:25,protein:2.0,fat:0.2,carbs:3.0,micros:{iron:0.9,fiber:2.0,salt:0.5}},
  {name:'おひたし 小松菜 (1小鉢)',aliases:[],calories:20,protein:1.5,fat:0.2,carbs:3.0,micros:{calcium:80,fiber:1.5,salt:0.5}},
  {name:'切り干し大根 (1小鉢)',aliases:[],calories:40,protein:1.0,fat:1.5,carbs:6.0,micros:{fiber:2.5,salt:0.7}},
  {name:'きんぴらごぼう (1小鉢)',aliases:['ゴボウ'],calories:65,protein:1.0,fat:3.0,carbs:8.0,micros:{fiber:2.5,salt:0.8}},
  {name:'エリンギ (50g)',aliases:['きのこ'],calories:12,protein:1.3,fat:0.2,carbs:2.6,micros:{fiber:2.2}},
  {name:'マイタケ (50g)',aliases:['舞茸'],calories:8,protein:1.0,fat:0.2,carbs:1.5,micros:{fiber:1.4}},
  {name:'しいたけ (50g)',aliases:['きのこ'],calories:10,protein:1.5,fat:0.2,carbs:2.5,micros:{fiber:2.0}},
  {name:'ひじき煮 (1小鉢)',aliases:['海藻'],calories:50,protein:2.0,fat:2.0,carbs:6.0,micros:{fiber:3.0,iron:1.5,salt:0.8}},
  {name:'もずく酢 (1パック 60g)',aliases:['海藻'],calories:20,protein:0.3,fat:0.1,carbs:4.5,micros:{salt:0.8,fiber:0.8}},
  {name:'焼きのり (1枚 3g)',aliases:['海苔'],calories:6,protein:1.2,fat:0.1,carbs:1.3,micros:{fiber:1.1,salt:0.1}},
  {name:'ポテトサラダ (100g)',aliases:['ポテサラ'],calories:160,protein:2.0,fat:11.0,carbs:13.0,micros:{vitaminC:10,salt:0.8,fiber:1.5}},
  {name:'フライドポテト (100g)',aliases:['ポテト'],calories:237,protein:2.9,fat:11.5,carbs:29.3,micros:{salt:0.6,fiber:2.5}},
  {name:'バナナ (1本 100g)',aliases:['ばなな'],calories:93,protein:1.1,fat:0.2,carbs:22.5,micros:{potassium:360,fiber:1.1}},
  {name:'いちご (中5個 75g)',aliases:['イチゴ'],calories:26,protein:0.7,fat:0.1,carbs:6.4,micros:{vitaminC:47,fiber:1.1}},
  {name:'りんご (1個 150g)',aliases:['リンゴ'],calories:80,protein:0.3,fat:0.3,carbs:21.5,micros:{fiber:2.3}},
  {name:'みかん (1個 100g)',aliases:['ミカン'],calories:45,protein:0.5,fat:0.1,carbs:12.0,micros:{vitaminC:32,fiber:1.0}},
  {name:'キウイ (5個 100g)',aliases:[],calories:53,protein:1.0,fat:0.1,carbs:13.5,micros:{vitaminC:69,fiber:2.5}},

  // === スープ・汁物 ===
  {name:'味噌汁（豆腐）',aliases:['みそ汁'],calories:50,protein:3.0,fat:1.5,carbs:4.0,micros:{salt:1.5,calcium:30,fiber:0.6}},
  {name:'味噌汁（わかめ）',aliases:['みそ汁'],calories:35,protein:2.2,fat:0.6,carbs:4.0,micros:{salt:1.5,fiber:0.8}},
  {name:'味噌汁（きのこ）',aliases:['みそ汁'],calories:40,protein:2.5,fat:0.8,carbs:5.0,micros:{salt:1.5,fiber:1.2}},
  {name:'味噌汁（キャベツ）',aliases:['みそ汁'],calories:45,protein:2.3,fat:0.7,carbs:6.0,micros:{salt:1.5,fiber:0.8}},
  {name:'味噌汁（白菜）',aliases:['みそ汁'],calories:40,protein:2.2,fat:0.6,carbs:5.0,micros:{salt:1.5,fiber:0.6}},
  {name:'味噌汁（大根）',aliases:['みそ汁'],calories:35,protein:2.2,fat:0.6,carbs:4.5,micros:{salt:1.5,fiber:0.8}},
  {name:'味噌汁（そうめん）',aliases:['みそ汁'],calories:80,protein:3.0,fat:0.5,carbs:14.0,micros:{salt:1.8,fiber:0.5}},
  {name:'味噌汁（具なし）',aliases:['みそ汁'],calories:30,protein:2.0,fat:0.5,carbs:3.5,micros:{salt:1.4,fiber:0.2}},
  {name:'豚汁 (1杯)',aliases:['とんじる'],calories:120,protein:6.0,fat:7.0,carbs:7.0,micros:{salt:2.0,fiber:1.5}},
  {name:'すまし汁（卵） (1杯)',aliases:['お吸い物'],calories:50,protein:3.5,fat:2.5,carbs:2.0,micros:{salt:1.5}},
  {name:'コーンスープ (1杯)',aliases:['ポタージュ'],calories:70,protein:1.0,fat:2.5,carbs:11.0,micros:{salt:1.0,fiber:0.5}},
  {name:'ミネストローネ (1杯)',aliases:['スープ'],calories:90,protein:3.0,fat:3.5,carbs:12.0,micros:{salt:1.5,fiber:1.5}},
  {name:'わかめスープ (1杯)',aliases:['スープ'],calories:20,protein:1.0,fat:0.5,carbs:3.0,micros:{salt:1.3,fiber:0.5}},

  // === 調味料・油 ===
  {name:'醤油 (大さじ1 18g)',aliases:['しょうゆ'],calories:13,protein:1.4,fat:0,carbs:1.4,micros:{salt:2.6}},
  {name:'味噌 (大さじ1 18g)',aliases:['みそ'],calories:38,protein:2.2,fat:1.0,carbs:5.2,micros:{salt:2.2,fiber:0.9}},
  {name:'塩 (小さじ1 6g)',aliases:['しお'],calories:0,protein:0,fat:0,carbs:0,micros:{salt:6.0}},
  {name:'砂糖 (大さじ1 9g)',aliases:['さとう'],calories:35,protein:0,fat:0,carbs:9.0,micros:{salt:0}},
  {name:'マヨネーズ (大さじ1 15g)',aliases:['まよねーず'],calories:105,protein:0.2,fat:11.3,carbs:0.7,micros:{salt:0.3}},
  {name:'ケチャップ (大さじ1 15g)',aliases:[],calories:18,protein:0.2,fat:0,carbs:4.1,micros:{salt:0.5}},
  {name:'中濃ソース (大さじ1 18g)',aliases:['ソース'],calories:24,protein:0.2,fat:0,carbs:5.4,micros:{salt:1.0}},
  {name:'ごまドレッシング (大さじ1 15g)',aliases:[],calories:59,protein:0.4,fat:5.2,carbs:2.4,micros:{salt:0.5}},
  {name:'和風ドレッシング (大さじ1)',aliases:[],calories:12,protein:0.3,fat:0,carbs:2.6,micros:{salt:0.8}},
  {name:'サラダ油 (大さじ1 12g)',aliases:['油'],calories:111,protein:0,fat:12.0,carbs:0,micros:{salt:0}},
  {name:'ごま油 (大さじ1 12g)',aliases:['油'],calories:111,protein:0,fat:12.0,carbs:0,micros:{salt:0}},
  {name:'オリーブオイル (大さじ1)',aliases:['油'],calories:111,protein:0,fat:12.0,carbs:0,micros:{salt:0}},
  {name:'バター (大さじ1 12g)',aliases:['ばたー'],calories:89,protein:0.1,fat:9.8,carbs:0,micros:{salt:0.2}},
  {name:'カレールー (1食分 20g)',aliases:['カレー'],calories:102,protein:1.2,fat:7.0,carbs:8.5,micros:{salt:2.1,fiber:1.0}},

  // === 料理・定番 ===
  {name:'ビーフカレーライス (1人前)',aliases:['カレー'],calories:700,protein:16.0,fat:25.0,carbs:100.0,micros:{salt:2.8,fiber:4.5}},
  {name:'オムライス (1人前)',aliases:[],calories:650,protein:18.0,fat:20.0,carbs:95.0,micros:{salt:3.5,fiber:2.0}},
  {name:'かつ丼 (1人前)',aliases:['カツ丼'],calories:850,protein:30.0,fat:30.0,carbs:110.0,micros:{salt:4.5,fiber:3.0}},
  {name:'親子丼 (1人前)',aliases:['どんぶり'],calories:680,protein:28.0,fat:18.0,carbs:95.0,micros:{salt:3.8,fiber:1.5}},
  {name:'牛丼 (1人前)',aliases:['どんぶり'],calories:720,protein:22.0,fat:25.0,carbs:95.0,micros:{salt:3.5,fiber:2.0}},
  {name:'うな重 (1人前)',aliases:['鰻'],calories:750,protein:25.0,fat:25.0,carbs:100.0,micros:{salt:3.0}},
  {name:'すき焼き (1人前)',aliases:['すきやき'],calories:650,protein:25.0,fat:45.0,carbs:35.0,micros:{salt:4.0,fiber:4.0}},
  {name:'おでん (1人前 5種)',aliases:['オデン'],calories:280,protein:20.0,fat:12.0,carbs:25.0,micros:{salt:4.5,fiber:3.5}},
  {name:'筑前煮 (1小鉢)',aliases:['煮物'],calories:150,protein:8.0,fat:6.0,carbs:18.0,micros:{salt:1.8,fiber:4.0}},
  {name:'青椒肉絲 (1人前)',aliases:[],calories:320,protein:15.0,fat:22.0,carbs:15.0,micros:{salt:2.5,fiber:2.5}},
  {name:'回鍋肉 (1人前)',aliases:['ホイコーロー'],calories:380,protein:14.0,fat:28.0,carbs:18.0,micros:{salt:2.8,fiber:3.0}},
  {name:'天津飯 (1人前)',aliases:['てんしんはん'],calories:700,protein:22.0,fat:25.0,carbs:90.0,micros:{salt:4.0,fiber:2.0}},
  {name:'八宝菜 (1人前)',aliases:['はっぽうさい'],calories:300,protein:15.0,fat:18.0,carbs:15.0,micros:{salt:2.5,fiber:3.5}},
  {name:'麻婆茄子 (1人前)',aliases:['中華'],calories:310,protein:10.0,fat:22.0,carbs:18.0,micros:{salt:2.5,fiber:3.0}},
  {name:'肉じゃが (1小鉢)',aliases:['にくじゃが'],calories:250,protein:8.0,fat:10.0,carbs:30.0,micros:{salt:1.5,fiber:2.5}},
  {name:'ロールキャベツ (1個)',aliases:[],calories:120,protein:7.0,fat:7.0,carbs:7.0,micros:{salt:1.2,fiber:1.5}},
  {name:'カニクリームコロッケ (1個)',aliases:['コロッケ'],calories:160,protein:3.5,fat:10.0,carbs:12.0,micros:{salt:0.8,fiber:0.5}},
  {name:'ポテトコロッケ (1個)',aliases:['コロッケ'],calories:150,protein:2.5,fat:9.0,carbs:14.0,micros:{salt:0.8,fiber:1.5}},
  {name:'餃子1個',aliases:['ぎょうざ'],calories:40,protein:1.5,fat:2.0,carbs:3.5,micros:{salt:0.2,fiber:0.3}},
  {name:'お好み焼き (1枚)',aliases:['おこのみやき'],calories:550,protein:20.0,fat:20.0,carbs:65.0,micros:{salt:3.5,fiber:4.5}},
  {name:'たこ焼き (1枚)',aliases:['粉もの'],calories:480,protein:18.0,fat:18.0,carbs:60.0,micros:{salt:3.0,fiber:3.0}},
  {name:'グリーンサラダ (1人前)',aliases:['生野菜'],calories:30,protein:1.5,fat:0.5,carbs:6.0,micros:{fiber:2.0,vitaminC:20}},
  {name:'サンドイッチたまご (1パック)',aliases:['パン'],calories:320,protein:10.0,fat:18.0,carbs:30.0,micros:{salt:1.5,fiber:1.5}},
  {name:'ビッグマック (1個)',aliases:['マック'],calories:525,protein:26.0,fat:28.3,carbs:41.8,micros:{salt:2.6,fiber:3.0}},
  {name:'チーズバーガー (1個)',aliases:['マック'],calories:307,protein:15.8,fat:13.4,carbs:30.8,micros:{salt:1.9,fiber:1.5}},

  // === サプリ ===
  {name:'エクスプロージョン プレーン(30g)',aliases:['プロテイン'],calories:119,protein:23.0,fat:1.5,carbs:2.5,micros:{calcium:120,salt:0.2}},
  {name:'NU SCIENCE ビタミンD2',aliases:['サプリ'],calories:1,protein:0.06,fat:0.01,carbs:0.16,micros:{salt:0,vitaminD:25}},
  {name:'NU SCIENCE ビタミンB+ (1粒)',aliases:['サプリ'],calories:2.15,protein:0.13,fat:0.05,carbs:0.3,micros:{salt:0,vitaminB1:25,vitaminB2:25,vitaminB6:25,vitaminB12:25,folate:100}},
  {name:'マルチビタミン (1粒)',aliases:['サプリ'],calories:2,protein:0,fat:0,carbs:0.5,micros:{vitaminC:100,vitaminB1:1,vitaminB2:1}},

  // === お菓子・デザート ===
  {name:'カントリーマアム (1枚 10g)',aliases:['お菓子'],calories:48,protein:0.5,fat:2.3,carbs:6.3,micros:{salt:0.05}},
  {name:'リッツバニラサンド (1個)',aliases:['お菓子'],calories:48,protein:0.4,fat:2.5,carbs:5.9,micros:{salt:0.1}},
  {name:'リッツチョコサンド (1個)',aliases:['お菓子'],calories:47,protein:0.5,fat:2.3,carbs:6.1,micros:{salt:0.1}},
  {name:'リッツチーズサンド (1個)',aliases:['お菓子'],calories:49,protein:0.6,fat:2.8,carbs:5.4,micros:{salt:0.1}},
  {name:'オレオ (1個)',aliases:['お菓子'],calories:53,protein:0.5,fat:2.2,carbs:7.7,micros:{salt:0.1}},
  {name:'ブラックサンダーミニ (13g)',aliases:['お菓子'],calories:69,protein:0.8,fat:3.7,carbs:8.1,micros:{salt:0.1}},
  {name:'キットカット (1枚)',aliases:['お菓子'],calories:62,protein:0.8,fat:3.5,carbs:7.0,micros:{salt:0}},
  {name:'ミレービスケット (1枚 3g)',aliases:['お菓子'],calories:15,protein:0.2,fat:0.7,carbs:1.9,micros:{salt:0.04}},
  {name:'ホワイトロリータ (1本 7g)',aliases:['お菓子'],calories:38,protein:0.3,fat:2.0,carbs:4.6,micros:{salt:0.03}},
  {name:'ルマンド (1本 7.4g)',aliases:['お菓子'],calories:37,protein:0.3,fat:1.6,carbs:5.3,micros:{salt:0.02}},
  {name:'スポンジケーキ (1切れ)',aliases:['お菓子'],calories:200,protein:3.5,fat:8.0,carbs:28.0,micros:{salt:0.2}},
  {name:'御座候 赤あん (1個)',aliases:['お菓子'],calories:200,protein:5.0,fat:1.5,carbs:42.0,micros:{salt:0.2,fiber:2.5}},
  {name:'御座候 白あん (1個)',aliases:['お菓子'],calories:205,protein:5.5,fat:1.5,carbs:43.0,micros:{salt:0.2,fiber:2.5}},
  {name:'あんこロール (1切れ 50g)',aliases:['お菓子'],calories:150,protein:3.0,fat:5.0,carbs:23.0,micros:{salt:0.1}},
  {name:'ベイクドチーズケーキ (100g)',aliases:['お菓子'],calories:315,protein:7.0,fat:22.0,carbs:22.0,micros:{salt:0.4}},
  {name:'みたらし団子 (1本 50g)',aliases:['和菓子'],calories:98,protein:1.5,fat:0.2,carbs:22.5,micros:{salt:0.4}},
  {name:'大福 (1個 80g)',aliases:['和菓子'],calories:190,protein:3.5,fat:0.5,carbs:43.0,micros:{salt:0.1}},
  {name:'どら焼き (1個 80g)',aliases:['和菓子'],calories:227,protein:4.5,fat:1.5,carbs:49.0,micros:{salt:0.3}},
  {name:'アズキバー (1本)',aliases:['アイス'],calories:110,protein:2.0,fat:0.5,carbs:25.0,micros:{salt:0.1}},
  {name:'ロールケーキ (1切れ)',aliases:['ケーキ'],calories:250,protein:4.0,fat:14.0,carbs:25.0,micros:{salt:0.2}},
  {name:'ショートケーキ (100g)',aliases:['ケーキ'],calories:308,protein:4.5,fat:20.0,carbs:28.0,micros:{salt:0.2}},
  {name:'シュークリーム (1個 80g)',aliases:['デザート'],calories:180,protein:4.0,fat:11.0,carbs:16.0,micros:{salt:0.2}},
  {name:'プリン (1個 100g)',aliases:['デザート'],calories:126,protein:5.5,fat:5.0,carbs:14.7,micros:{salt:0.1}},
  {name:'ポテトチップス (1袋 60g)',aliases:['スナック'],calories:336,protein:2.8,fat:21.6,carbs:32.4,micros:{salt:0.6}},
  {name:'せんべい (1枚 15g)',aliases:['お菓子'],calories:57,protein:1.1,fat:0.1,carbs:13.0,micros:{salt:0.3}},
  {name:'ブラックサンダー (36g)',aliases:['お菓子'],calories:192,protein:2.2,fat:10.3,carbs:22.5,micros:{salt:0.3}},

  // === 飲料・酒 ===
  {name:'コーヒー ブラック (1杯)',aliases:['飲み物'],calories:6,protein:0.3,fat:0,carbs:1.1,micros:{salt:0}},
  {name:'カフェラテ (1杯 200ml)',aliases:['飲み物'],calories:120,protein:4.0,fat:6.0,carbs:12.0,micros:{salt:0.2}},
  {name:'緑茶/ウーロン茶 (1杯)',aliases:['お茶'],calories:0,protein:0,fat:0,carbs:0,micros:{salt:0}},
  {name:'コーラ (1杯 200ml)',aliases:['ジュース'],calories:92,protein:0,fat:0,carbs:22.8,micros:{salt:0}},
  {name:'サッポロ黒ラベル350ml',aliases:['ビール'],calories:140,protein:1.0,fat:0.0,carbs:10.5,micros:{salt:0}},
  {name:'発泡酒 (1缶 350ml)',aliases:['ビール'],calories:158,protein:0.5,fat:0,carbs:12.6,micros:{salt:0}},
  {name:'レモンサワー (1杯 350ml)',aliases:['お酒'],calories:165,protein:0,fat:0,carbs:8.0,micros:{salt:0.1}},
  {name:'日本酒 (1合 180ml)',aliases:['お酒'],calories:185,protein:0.7,fat:0,carbs:8.8,micros:{salt:0}},
  {name:'ウイスキーシングル (30ml)',aliases:['お酒'],calories:71,protein:0.0,fat:0.0,carbs:0.0,micros:{salt:0}},
  {name:'ワイン 赤 (グラス 120ml)',aliases:['お酒'],calories:88,protein:0.2,fat:0,carbs:1.8,micros:{salt:0}}
];

const DEFAULT_INITIAL_PRESETS = [
  { name: '味噌汁（豆腐）', calories: 50, protein: 3.0, fat: 1.5, carbs: 4.0, micros: { salt: 1.5, calcium: 30, fiber: 0.6, iron: 0.5, potassium: 150, magnesium: 15, phosphorus: 40, zinc: 0.3, copper: 0.05, vitaminB1: 0.03, vitaminB2: 0.03, vitaminB6: 0.03, folate: 10 }, groupId: 'g1' },
  { name: '味噌汁（わかめ）', calories: 35, protein: 2.2, fat: 0.6, carbs: 4.0, micros: { salt: 1.5, fiber: 0.8, calcium: 20, potassium: 120, iron: 0.4, magnesium: 12, phosphorus: 30, zinc: 0.2, copper: 0.03, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.02, folate: 5 }, groupId: 'g1' },
  { name: '味噌汁（キャベツ）', calories: 45, protein: 2.3, fat: 0.7, carbs: 6.0, micros: { salt: 1.5, fiber: 0.8, vitaminC: 5, potassium: 140, calcium: 18, iron: 0.3, magnesium: 10, phosphorus: 30, zinc: 0.2, copper: 0.03, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.03, folate: 15 }, groupId: 'g1' },
  { name: '味噌汁（きのこ）', calories: 40, protein: 2.5, fat: 0.8, carbs: 5.0, micros: { salt: 1.5, fiber: 1.2, potassium: 160, calcium: 15, iron: 0.4, magnesium: 12, phosphorus: 35, zinc: 0.3, copper: 0.04, vitaminB1: 0.03, vitaminB2: 0.05, vitaminB6: 0.03, folate: 10, vitaminD: 0.5 }, groupId: 'g1' },
  { name: '味噌汁（白菜）', calories: 40, protein: 2.2, fat: 0.6, carbs: 5.0, micros: { salt: 1.5, fiber: 0.6, vitaminC: 3, potassium: 130, calcium: 15, iron: 0.3, magnesium: 10, phosphorus: 30, zinc: 0.2, copper: 0.03, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.03, folate: 10 }, groupId: 'g1' },
  { name: '味噌汁（大根）', calories: 35, protein: 2.2, fat: 0.6, carbs: 4.5, micros: { salt: 1.5, fiber: 0.8, vitaminC: 2, potassium: 120, calcium: 15, iron: 0.3, magnesium: 10, phosphorus: 25, zinc: 0.2, copper: 0.02, vitaminB1: 0.01, vitaminB2: 0.01, vitaminB6: 0.01, folate: 5 }, groupId: 'g1' },
  { name: '味噌汁（具なし）', calories: 30, protein: 2.0, fat: 0.5, carbs: 3.5, micros: { salt: 1.4, fiber: 0.2, potassium: 80, calcium: 10, iron: 0.2, magnesium: 8, phosphorus: 20, zinc: 0.1, copper: 0.02, vitaminB1: 0.01, vitaminB2: 0.01, vitaminB6: 0.01, folate: 2 }, groupId: 'g1' },
  { name: 'ごはん180g', calories: 281, protein: 4.5, fat: 0.5, carbs: 66.8, micros: { fiber: 0.5, salt: 0, zinc: 1.1, iron: 0.2, potassium: 52, magnesium: 13, phosphorus: 61, copper: 0.18, vitaminB1: 0.04, vitaminB2: 0.02, vitaminB6: 0.07 }, groupId: 'g1' },
  { name: '卵焼き (卵1個分)', calories: 85, protein: 6.5, fat: 5.5, carbs: 1.0, micros: { cholesterol: 210, salt: 0.4, iron: 0.9, potassium: 70, calcium: 25, magnesium: 6, phosphorus: 95, zinc: 0.6, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.2, vitaminB6: 0.04, vitaminB12: 0.4, folate: 20, vitaminE: 0.7, saturatedFat: 1.6 }, groupId: 'g1' },
  { name: 'ゆで卵 (1個 50g)', calories: 67, protein: 6.5, fat: 4.3, carbs: 0.2, micros: { cholesterol: 210, vitaminD: 0.9, iron: 0.9, salt: 0.1, potassium: 65, calcium: 25, magnesium: 6, phosphorus: 90, zinc: 0.6, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.2, vitaminB6: 0.04, vitaminB12: 0.4, folate: 20, vitaminE: 0.5, saturatedFat: 1.3 }, groupId: 'g1' },
  { name: 'ちりめんじゃこ大さじ1', calories: 10, protein: 2.0, fat: 0.2, carbs: 0.0, micros: { calcium: 26, salt: 0.3, vitaminD: 0.3, iron: 0.1, potassium: 15, magnesium: 3, phosphorus: 30, zinc: 0.1, cholesterol: 15 }, groupId: 'g1' },
  
  { name: '鶏むね肉 皮なし (生 100g)', calories: 108, protein: 22.3, fat: 1.5, carbs: 0, micros: { cholesterol: 77, salt: 0.1, potassium: 350, magnesium: 27, phosphorus: 200, zinc: 0.7, iron: 0.3, copper: 0.04, vitaminB1: 0.08, vitaminB2: 0.1, vitaminB6: 0.6, saturatedFat: 0.4, n6Fat: 0.4 }, groupId: 'g2' },
  { name: 'ごはん180g', calories: 281, protein: 4.5, fat: 0.5, carbs: 66.8, micros: { fiber: 0.5, salt: 0, zinc: 1.1, iron: 0.2, potassium: 52, magnesium: 13, phosphorus: 61, copper: 0.18, vitaminB1: 0.04, vitaminB2: 0.02, vitaminB6: 0.07 }, groupId: 'g2' },
  { name: '焼き鮭 100g', calories: 140, protein: 22.5, fat: 4.8, carbs: 0.1, micros: { vitaminD: 30, salt: 1.5, iron: 0.4, zinc: 0.5, potassium: 360, magnesium: 28, phosphorus: 240, copper: 0.06, vitaminB1: 0.15, vitaminB2: 0.12, vitaminB6: 0.6, vitaminB12: 5.0, folate: 10, n3Fat: 1.2, cholesterol: 60, saturatedFat: 0.8 }, groupId: 'g2' },
  { name: 'キャベツの千切り (60g)', calories: 14, protein: 0.8, fat: 0.1, carbs: 3.1, micros: { vitaminC: 24, fiber: 1.1, salt: 0, potassium: 120, calcium: 25, magnesium: 8, phosphorus: 16, zinc: 0.1, copper: 0.01, vitaminB1: 0.02, vitaminB2: 0.02, vitaminB6: 0.06, folate: 47 }, groupId: 'g2' },
  { name: 'ブロッコリー (15g)', calories: 5, protein: 0.7, fat: 0.1, carbs: 0.7, micros: { vitaminC: 9, fiber: 0.6, salt: 0, potassium: 27, calcium: 6, magnesium: 3, phosphorus: 10, zinc: 0.1, copper: 0.01, vitaminB1: 0.01, vitaminB2: 0.01, vitaminB6: 0.03, folate: 18 }, groupId: 'g2' },
  { name: '冷ややっこ (100g)', calories: 56, protein: 5.0, fat: 3.0, carbs: 1.7, micros: { calcium: 43, iron: 0.8, fiber: 0.3, salt: 0.3, potassium: 147, magnesium: 43, phosphorus: 73, zinc: 0.6, copper: 0.1, vitaminB1: 0.07, vitaminB2: 0.03, vitaminB6: 0.07, folate: 13, saturatedFat: 0.4 }, groupId: 'g2' },

  { name: 'エクスプロージョン プレーン(30g)', calories: 119, protein: 23.0, fat: 1.5, carbs: 2.5, micros: { calcium: 120, salt: 0.2, potassium: 150, magnesium: 15, phosphorus: 80, zinc: 0.5, cholesterol: 10, saturatedFat: 0.8, vitaminB1: 0.5, vitaminB2: 0.5, vitaminB6: 0.5, vitaminC: 20 }, groupId: 'g4' },
  { name: 'NU SCIENCE ビタミンD2', calories: 1, protein: 0.06, fat: 0.01, carbs: 0.16, micros: { salt: 0, vitaminD: 25.0 }, groupId: 'g4' },
  { name: 'NU SCIENCE ビタミンB+ (1粒)', calories: 2.15, protein: 0.13, fat: 0.05, carbs: 0.3, micros: { salt: 0, vitaminB1: 25, vitaminB2: 25, vitaminB6: 25, vitaminB12: 25, folate: 100 }, groupId: 'g4' },

  { name: 'カントリーマアム (1枚 10g)', calories: 48, protein: 0.5, fat: 2.3, carbs: 6.3, micros: { salt: 0.05 }, groupId: 'g5' },
  { name: 'リッツバニラサンド (1個)', calories: 48, protein: 0.4, fat: 2.5, carbs: 5.9, micros: { salt: 0.1, fiber: 0.1, calcium: 4, saturatedFat: 1.1, iron: 0.1, potassium: 10, magnesium: 2, phosphorus: 8, zinc: 0.1, copper: 0.01, vitaminE: 0.2 }, groupId: 'g5' },
  { name: 'リッツチョコサンド (1個)', calories: 47, protein: 0.5, fat: 2.3, carbs: 6.1, micros: { salt: 0.1, fiber: 0.2, calcium: 5, saturatedFat: 1.0, iron: 0.2, potassium: 15, magnesium: 4, phosphorus: 12, zinc: 0.1, copper: 0.02, vitaminE: 0.2 }, groupId: 'g5' },
  { name: 'リッツチーズサンド (1個)', calories: 49, protein: 0.6, fat: 2.8, carbs: 5.4, micros: { salt: 0.1, fiber: 0.1, calcium: 15, saturatedFat: 1.3, iron: 0.1, potassium: 12, magnesium: 3, phosphorus: 15, zinc: 0.1, copper: 0.01, vitaminB2: 0.02, vitaminE: 0.3 }, groupId: 'g5' },
  { name: 'オレオ (1個)', calories: 53, protein: 0.5, fat: 2.2, carbs: 7.7, micros: { salt: 0.1, fiber: 0.2, calcium: 5, iron: 0.2, saturatedFat: 1.0, potassium: 15, magnesium: 3, phosphorus: 10, zinc: 0.1, copper: 0.02, vitaminB1: 0.01, vitaminB2: 0.01, vitaminE: 0.2 }, groupId: 'g5' },
  { name: 'ブラックサンダーミニ (13g)', calories: 69, protein: 0.8, fat: 3.7, carbs: 8.1, micros: { salt: 0.1, fiber: 0.3, calcium: 8, saturatedFat: 2.1, iron: 0.2, potassium: 20, magnesium: 5, phosphorus: 12, zinc: 0.1, copper: 0.02, vitaminB1: 0.01, vitaminB2: 0.01, vitaminE: 0.3 }, groupId: 'g5' },
  { name: 'キットカット (1枚)', calories: 62, protein: 0.8, fat: 3.5, carbs: 7.0, micros: { salt: 0, fiber: 0.2, calcium: 10, saturatedFat: 2.0, iron: 0.2, potassium: 25, magnesium: 6, phosphorus: 15, zinc: 0.1, copper: 0.02, vitaminB1: 0.01, vitaminB2: 0.02, vitaminE: 0.3 }, groupId: 'g5' },
  { name: 'ミレービスケット (1枚 3g)', calories: 15, protein: 0.2, fat: 0.7, carbs: 1.9, micros: { salt: 0.04 }, groupId: 'g5' },
  { name: 'ホワイトロリータ (1本 7g)', calories: 38, protein: 0.3, fat: 2.0, carbs: 4.6, micros: { salt: 0.03 }, groupId: 'g5' },
  { name: 'ルマンド (1本 7.4g)', calories: 37, protein: 0.3, fat: 1.6, carbs: 5.3, micros: { salt: 0.02 }, groupId: 'g5' },
  { name: 'スポンジケーキ (1切れ)', calories: 200, protein: 3.5, fat: 8.0, carbs: 28.0, micros: { salt: 0.2, calcium: 20, cholesterol: 80, saturatedFat: 3.5, fiber: 0.3, iron: 0.3, potassium: 60, magnesium: 6, phosphorus: 40, zinc: 0.3, copper: 0.02, vitaminB1: 0.03, vitaminB2: 0.08, vitaminB6: 0.02, vitaminB12: 0.2, folate: 10, vitaminE: 0.5 }, groupId: 'g5' },
  { name: '御座候 赤あん (1個)', calories: 200, protein: 5.0, fat: 1.5, carbs: 42.0, micros: { fiber: 2.5, salt: 0.2, iron: 1.0, potassium: 120, calcium: 15, magnesium: 20, phosphorus: 50, zinc: 0.5, copper: 0.05, vitaminB1: 0.05, vitaminB2: 0.04, vitaminB6: 0.05, folate: 10 }, groupId: 'g5' },
  { name: '御座候 白あん (1個)', calories: 205, protein: 5.5, fat: 1.5, carbs: 43.0, micros: { fiber: 2.5, salt: 0.2, iron: 1.2, potassium: 130, calcium: 18, magnesium: 22, phosphorus: 55, zinc: 0.6, copper: 0.06, vitaminB1: 0.06, vitaminB2: 0.05, vitaminB6: 0.06, folate: 12 }, groupId: 'g5' },
  { name: 'あんこロール (1切れ 50g)', calories: 150, protein: 3.0, fat: 5.0, carbs: 23.0, micros: { salt: 0.1 }, groupId: 'g5' },
  { name: 'ベイクドチーズケーキ (100g)', calories: 315, protein: 7.0, fat: 22.0, carbs: 22.0, micros: { salt: 0.4, calcium: 70, cholesterol: 100, saturatedFat: 12.0, fiber: 0.2, iron: 0.4, potassium: 90, magnesium: 12, phosphorus: 100, zinc: 0.8, copper: 0.03, vitaminB1: 0.03, vitaminB2: 0.2, vitaminB6: 0.04, vitaminB12: 0.4, folate: 15, vitaminE: 1.0 }, groupId: 'g5' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
  
  const [currentView, setCurrentView] = useState('summary');
  const [isRecordSheetOpen, setIsRecordSheetOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [editScale, setEditScale] = useState(100);
  const [customEditScaleInput, setCustomEditScaleInput] = useState('');
  
  const [dailyTargets, setDailyTargets] = useState({});
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [customCalorieInput, setCustomCalorieInput] = useState('');

  const defaultProfile = {
    gender: 'male',
    age: 30,
    height: 170,
    weight: 65,
    bodyFat: '',
    activityLevel: 'none',
    goal: 'health',
    pfcTarget: { p: 20, f: 20, c: 60 },
    theme: 'light',
    favoriteGroups: [
      { id: 'g1', name: '朝食' },
      { id: 'g2', name: '昼食' },
      { id: 'g3', name: '夕食' },
      { id: 'g4', name: 'サプリ' },
      { id: 'g5', name: 'お菓子' }
    ],
    mealTimes: {
      breakfast: { start: '04:00', end: '07:59' },
      lunch: { start: '08:00', end: '14:59' },
      dinner: { start: '15:00', end: '21:59' }
    }
  };
  
  const [userProfile, setUserProfile] = useState(defaultProfile);
  const [hasProfile, setHasProfile] = useState(false);

  const isDark = userProfile.theme === 'dark';

  const cl = {
    bgMain: isDark ? 'bg-slate-900' : 'bg-gray-50',
    bgCard: isDark ? 'bg-slate-800' : 'bg-white',
    bgSub: isDark ? 'bg-slate-700/50' : 'bg-gray-50',
    bgHover: isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100',
    textMain: isDark ? 'text-slate-200' : 'text-slate-800',
    textBold: isDark ? 'text-slate-100' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-gray-500',
    textMutedLight: isDark ? 'text-slate-500' : 'text-gray-400',
    borderBase: isDark ? 'border-slate-700' : 'border-gray-100',
    borderInput: isDark ? 'border-slate-600' : 'border-gray-300',
    bgInput: isDark ? 'bg-slate-800' : 'bg-white',
    bgModal: isDark ? 'bg-slate-800' : 'bg-white',
    shadow: isDark ? 'shadow-none' : 'shadow-sm',
  };

  const getColorClass = (color) => {
    switch (color) {
      case 'blue': return isDark ? 'bg-blue-900/30 border-blue-800/50 text-blue-300' : 'bg-blue-50 border-blue-100/50 text-blue-900';
      case 'yellow': return isDark ? 'bg-yellow-900/30 border-yellow-800/50 text-yellow-300' : 'bg-yellow-50 border-yellow-100/50 text-yellow-900';
      case 'green': return isDark ? 'bg-green-900/30 border-green-800/50 text-green-300' : 'bg-green-50 border-green-100/50 text-green-900';
      case 'purple': return isDark ? 'bg-purple-900/30 border-purple-800/50 text-purple-300' : 'bg-purple-50 border-purple-100/50 text-purple-900';
      case 'teal': return isDark ? 'bg-teal-900/30 border-teal-800/50 text-teal-300' : 'bg-teal-50 border-teal-100/50 text-teal-900';
      case 'slate': return isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-900';
      default: return '';
    }
  };

  const getLabelColor = (color) => {
     switch (color) {
       case 'blue': return isDark ? 'text-blue-400' : 'text-blue-600';
       case 'yellow': return isDark ? 'text-yellow-400' : 'text-yellow-600';
       case 'green': return isDark ? 'text-green-400' : 'text-green-600';
       case 'purple': return isDark ? 'text-purple-400' : 'text-purple-600';
       case 'teal': return isDark ? 'text-teal-400' : 'text-teal-600';
       case 'slate': return isDark ? 'text-slate-400' : 'text-slate-600';
       default: return '';
     }
  };

  const [customPresets, setCustomPresets] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

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
  const [settingsTab, setSettingsTab] = useState('profile'); 
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
    const unsubscribePresets = onSnapshot(presetsRef, async (snapshot) => {
      const loadedPresets = snapshot.docs.map(doc => doc.data());
      
      const hasInitializedPresetsV9 = localStorage.getItem(`init_presets_v13_${user.uid}`);
      if (!hasInitializedPresetsV9) {
        localStorage.setItem(`init_presets_v13_${user.uid}`, 'true');
        try {
          for (const preset of DEFAULT_INITIAL_PRESETS) {
            if (!loadedPresets.find(p => p.name === preset.name && p.groupId === preset.groupId)) {
               const safeId = `${preset.name.replace(/\//g, '_')}_${preset.groupId}`; 
               await setDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'presets'), safeId), preset);
            }
          }
        } catch (err) {
          console.error('Error adding default presets', err);
        }
      }
      
      setCustomPresets(loadedPresets);
    }, (error) => console.error("Error fetching presets:", error));

    const searchHistoryRef = collection(db, 'artifacts', appId, 'users', user.uid, 'searchHistory');
    const unsubscribeSearchHistory = onSnapshot(searchHistoryRef, (snapshot) => {
      setSearchHistory(snapshot.docs.map(doc => doc.data()).sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => console.error("Error fetching search history:", error));

    const dailyTargetsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'dailyTargets');
    const unsubscribeDailyTargets = onSnapshot(dailyTargetsRef, (snapshot) => {
      const newTargets = {};
      snapshot.docs.forEach(doc => {
        newTargets[doc.id] = doc.data().customCalories;
      });
      setDailyTargets(newTargets);
    }, (error) => console.error("Error fetching daily targets:", error));

    return () => {
      unsubscribeProfile();
      unsubscribeMeals();
      unsubscribePresets();
      unsubscribeSearchHistory();
      unsubscribeDailyTargets();
    };
  }, [user]);

  const currentMicrosConfig = useMemo(() => getMicronutrientsConfig(userProfile.gender), [userProfile.gender]);
  
  const favoriteGroups = useMemo(() => {
    let groups = userProfile.favoriteGroups || defaultProfile.favoriteGroups;
    groups = groups.map(g => {
      if (g.id === 'g1' && g.name === 'お気に入り①') return { ...g, name: '朝食' };
      if (g.id === 'g2' && g.name === 'お気に入り②') return { ...g, name: '昼食' };
      if (g.id === 'g3' && g.name === 'お気に入り③') return { ...g, name: '夕食' };
      if (g.id === 'g4' && g.name === 'お気に入り④') return { ...g, name: 'サプリ' };
      return g;
    });
    if (!groups.find(g => g.id === 'g5')) {
      groups.push({ id: 'g5', name: 'お菓子' });
    }
    return groups;
  }, [userProfile.favoriteGroups]);

  const getCurrentMealType = () => {
    const times = userProfile.mealTimes || defaultProfile.mealTimes;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const isBetween = (time, start, end) => {
      if (!start || !end) return false;
      if (start <= end) return time >= start && time <= end;
      return time >= start || time <= end;
    };

    if (isBetween(currentTime, times.breakfast.start, times.breakfast.end)) return 'breakfast';
    if (isBetween(currentTime, times.lunch.start, times.lunch.end)) return 'lunch';
    if (isBetween(currentTime, times.dinner.start, times.dinner.end)) return 'dinner';
    return 'snack'; 
  };

  const openRecordSheet = () => {
    setInputType(getCurrentMealType());
    setIsRecordSheetOpen(true);
  };

  const currentDateString = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDate]);

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
    const currentCalTarget = dailyTargets[currentDateString] !== undefined ? dailyTargets[currentDateString] : tdee;

    const currentPfcTarget = userProfile.pfcTarget || PFC_TARGET_RATIOS;

    const p = Math.round((currentCalTarget * (currentPfcTarget.p / 100)) / 4);
    const f = Math.round((currentCalTarget * (currentPfcTarget.f / 100)) / 9);
    const c = Math.round((currentCalTarget * (currentPfcTarget.c / 100)) / 4);
    
    return {
      calories: currentCalTarget,
      protein: p,
      fat: f,
      carbs: c,
      sugar: Math.max(0, c - currentMicrosConfig.fiber.recommended),
      fiber: currentMicrosConfig.fiber.recommended,
      salt: currentMicrosConfig.salt.upperLimit,
    };
  }, [userProfile, hasProfile, currentMicrosConfig, dailyTargets, currentDateString]);

  const currentPfcTarget = useMemo(() => userProfile.pfcTarget || PFC_TARGET_RATIOS, [userProfile]);

  useEffect(() => {
    setIsEditMode(false);
  }, [activeInputTab, isRecordSheetOpen]);

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

  const openTargetModal = () => {
    setCustomCalorieInput(targets.calories.toString());
    setIsTargetModalOpen(true);
  };

  const handleSaveDailyTarget = async () => {
    if (!user) return;
    const newCal = parseInt(customCalorieInput, 10);
    if (isNaN(newCal) || newCal < 0) return;

    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'dailyTargets', currentDateString);
      await setDoc(docRef, { customCalories: newCal });
      showToast('目標カロリーを更新しました');
      setIsTargetModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDailyTarget = async () => {
     if (!user) return;
     try {
       const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'dailyTargets', currentDateString);
       await deleteDoc(docRef);
       showToast('目標カロリーを元の設定に戻しました');
       setIsTargetModalOpen(false);
     } catch(e) {
       console.error(e);
     }
  };

  const openEditModal = (meal) => {
    setEditingMeal({ ...meal, original: JSON.parse(JSON.stringify(meal)) });
    setEditScale(100);
    setCustomEditScaleInput('');
  };

  const handleEditScaleChange = (scale) => {
    if (isNaN(scale) || scale <= 0) return;
    const ratio = scale / 100;
    const formatNum = (num) => Math.round(num * 10) / 10;
    
    const orig = editingMeal.original;
    const newMicros = {};
    if (orig.micros) {
      Object.keys(currentMicrosConfig).forEach(key => {
        newMicros[key] = formatNum((orig.micros[key] || 0) * ratio);
      });
    }

    setEditingMeal(prev => ({
      ...prev,
      calories: Math.round((orig.calories || 0) * ratio),
      protein: formatNum((orig.protein || 0) * ratio),
      fat: formatNum((orig.fat || 0) * ratio),
      carbs: formatNum((orig.carbs || 0) * ratio),
      micros: newMicros
    }));
    setEditScale(scale);
  };

  const handleSaveEditedMeal = async () => {
    if (!user || !editingMeal) return;
    try {
      const mealRef = doc(db, 'artifacts', appId, 'users', user.uid, 'meals', editingMeal.id);
      await updateDoc(mealRef, {
        calories: parseFloat(editingMeal.calories) || 0,
        protein: parseFloat(editingMeal.protein) || 0,
        fat: parseFloat(editingMeal.fat) || 0,
        carbs: parseFloat(editingMeal.carbs) || 0,
        micros: editingMeal.micros || {}
      });
      showToast('記録を更新しました');
      setEditingMeal(null);
    } catch (error) {
      console.error("Error updating meal:", error);
    }
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

    setIsSearching(true);
    setSearchMode(mode);
    setSearchError('');
    setSearchResults(null);
    
    const lowerInput = inputName.toLowerCase().replace(/　/g, ' '); 
    const keywords = lowerInput.split(/\s+/).filter(kw => kw.length > 0);
    
    const combinedDataMap = new Map();
    [...LOCAL_FOOD_DATABASE, ...searchHistory, ...customPresets].forEach(item => {
        if (!combinedDataMap.has(item.name)) {
            combinedDataMap.set(item.name, item);
        }
    });
    const allData = Array.from(combinedDataMap.values());

    const localMatches = allData.filter(food => {
      const lowerName = food.name.toLowerCase();
      const aliases = food.aliases ? food.aliases.map(a => a.toLowerCase()) : [];
      return keywords.every(kw => 
        lowerName.includes(kw) || aliases.some(alias => alias.includes(kw))
      );
    });

    if (localMatches.length > 0 && mode === 'fast') {
      setTimeout(() => {
        if (localMatches.length === 1) {
          handleSelectSearchResult(localMatches[0]);
        } else {
          setSearchResults(localMatches);
          showToast(`内部データ・履歴から候補が見つかりました ⚡️`);
        }
        setIsSearching(false);
        setSearchMode('');
      }, 300);
      return; 
    }

    const apiKey = "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const prompt = mode === 'detailed'
      ? `「${inputName}」の栄養素を検索してください。
信頼性の高い食品成分サイトを優先して検索・参照してください。
検索結果として、該当しそうな候補を最大5件抽出し、JSONの配列形式で出力してください。
プロパティ: name, calories, protein, fat, carbs, ${Object.keys(currentMicrosConfig).join(', ')}。
単位は付けず数値のみ。該当しないものは0。`
      : `「${inputName}」の栄養素を推定し、最も一般的な1件のみをJSONの配列形式で出力してください。（高速化のため候補は1件のみ）
プロパティ: name, calories, protein, fat, carbs, ${Object.keys(currentMicrosConfig).join(', ')}。
単位は付けず数値のみ。該当しないものは0。`;

    const schemaProps = {
      name: { type: "STRING" },
      calories: { type: "NUMBER" }, protein: { type: "NUMBER" }, fat: { type: "NUMBER" }, carbs: { type: "NUMBER" }
    };
    Object.keys(currentMicrosConfig).forEach(key => schemaProps[key] = { type: "NUMBER" });

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: "application/json", 
        responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: schemaProps } } 
      }
    };
    
    if (mode === 'detailed') payload.tools = [{ google_search: {} }];

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
      if (resultJSON.length === 1) handleSelectSearchResult(resultJSON[0]);
      else setSearchResults(resultJSON);
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
      groupId: selectedGroupIdForSave 
    };
    
    try {
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
      const oldSafeId = item.name.replace(/\//g, '_');
      const currentSafeId = `${item.name.replace(/\//g, '_')}_${item.groupId || 'g1'}`;
      await deleteDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'presets'), currentSafeId));
      await deleteDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'presets'), oldSafeId));
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
      
      setIsRecordSheetOpen(false);
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
    if (settingsTab === 'profile' && ((tempProfile.pfcTarget?.p || 0) + (tempProfile.pfcTarget?.f || 0) + (tempProfile.pfcTarget?.c || 0)) !== 100) return;
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
        theme: tempProfile.theme || 'light',
        favoriteGroups: tempProfile.favoriteGroups || defaultProfile.favoriteGroups,
        mealTimes: tempProfile.mealTimes || defaultProfile.mealTimes
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

  const MacroBar = ({ label, current, target, colorClass, barColorClass, unit = 'g' }) => {
    const percent = target > 0 ? (current / target) * 100 : 0;
    const displayPercent = Math.min(percent, 100);
    const isOver = percent > 100;
    return (
      <div className={`rounded-xl p-3 border transition-colors ${cl.bgCard} ${cl.borderBase}`}>
        <div className={`text-xs font-bold mb-1 ${colorClass}`}>{label}</div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className={`text-lg font-black ${cl.textBold}`}>{Math.round(current * 10) / 10}</span>
          <span className={`text-[10px] font-bold ${cl.textMutedLight}`}>/ {target}{unit}</span>
        </div>
        <div className={`relative w-full rounded-full h-2.5 overflow-visible ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
          <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${isOver && label === '塩分' ? 'bg-red-500' : barColorClass}`} style={{ width: `${displayPercent}%` }}></div>
          <div className={`absolute top-[-2px] bottom-[-2px] w-0.5 z-10 ${isDark ? 'bg-slate-300' : 'bg-slate-800'}`} style={{left: '100%'}}></div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen pb-28 font-sans relative transition-colors duration-300 ${cl.bgMain} ${cl.textMain}`}>
      <header className={`${cl.bgModal} ${cl.shadow} sticky top-0 z-20 transition-colors duration-300 border-b ${cl.borderBase}`}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className={`text-xl font-black flex items-center gap-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
            <PieChart className="w-6 h-6" />
            Nutri AI
          </h1>
          <div className={`flex items-center gap-1 rounded-xl p-1 border transition-colors ${cl.bgSub} ${cl.borderBase}`}>
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)))} className={`p-1.5 rounded-lg transition-colors ${cl.bgHover} ${cl.textMuted} hover:${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}><ChevronLeft className="w-5 h-5" /></button>
            <div className={`flex items-center gap-2 px-3 text-sm font-bold min-w-[120px] justify-center ${cl.textBold}`}>
              <Calendar className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
              {isSameDay(currentDate, new Date()) ? '今日' : currentDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
            </div>
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)))} className={`p-1.5 rounded-lg transition-colors ${cl.bgHover} ${cl.textMuted} hover:${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {currentView === 'summary' && (
          <div className="animate-fade-in-up space-y-6">
            
            {/* カロリーバー（最上部） */}
            <div className={`p-5 rounded-3xl shadow-sm border transition-colors ${cl.bgCard} ${cl.borderBase}`}>
              <div className="flex justify-between items-end mb-3">
                <span className={`font-bold flex items-center gap-1.5 ${cl.textMuted}`}><Zap className="w-5 h-5 text-yellow-500" /> 摂取カロリー</span>
                <div className="text-right flex items-baseline gap-1 justify-end">
                  <span className={`text-4xl font-black ${cl.textBold}`}>{Math.round(totals.calories)}</span>
                  <button onClick={openTargetModal} className={`font-bold ml-1 transition-colors flex items-center gap-1 ${cl.textMutedLight} hover:${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} title="目標カロリーを調整">
                    / {targets.calories} kcal <span className={`p-1 rounded-md ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}><Plus className="w-3 h-3" /></span>
                  </button>
                </div>
              </div>
              <div className={`relative w-full rounded-full h-4 overflow-visible mt-2 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${totals.calories > targets.calories ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min((totals.calories / targets.calories) * 100, 100)}%` }}></div>
                <div className={`absolute top-[-4px] bottom-[-4px] w-1 z-10 ${isDark ? 'bg-slate-300' : 'bg-slate-800'}`} style={{left: '100%'}}></div>
              </div>
              <div className={`text-right mt-1.5 text-[10px] font-bold ${cl.textMutedLight}`}>目標ライン</div>
            </div>

            <section className={`rounded-3xl p-6 shadow-sm border transition-colors duration-300 ${cl.bgCard} ${cl.borderBase}`}>
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                {/* 左側: ドーナツグラフ */}
                <div className="relative w-40 h-40 flex-shrink-0">
                  <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90 transform drop-shadow-sm">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={isDark ? "#334155" : "#f1f5f9"} strokeWidth="5" />
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={isDark ? "#60a5fa" : "#3b82f6"} strokeWidth="5" 
                            strokeDasharray={`${pfcRatios.p} ${100 - pfcRatios.p}`} strokeDashoffset="0" className="transition-all duration-1000 ease-out" />
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={isDark ? "#facc15" : "#eab308"} strokeWidth="5" 
                            strokeDasharray={`${pfcRatios.f} ${100 - pfcRatios.f}`} strokeDashoffset={`-${pfcRatios.p}`} className="transition-all duration-1000 ease-out" />
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={isDark ? "#4ade80" : "#22c55e"} strokeWidth="5" 
                            strokeDasharray={`${pfcRatios.c} ${100 - pfcRatios.c}`} strokeDashoffset={`-${pfcRatios.p + pfcRatios.f}`} className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className={`absolute inset-0 flex flex-col items-center justify-center ${cl.textBold}`}>
                    <span className={`text-[11px] font-bold mb-0.5 ${cl.textMutedLight}`}>PFC (%)</span>
                    <div className="flex gap-1.5 text-base font-black">
                      <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>P:{pfcRatios.p}</span>
                      <span className={isDark ? 'text-yellow-400' : 'text-yellow-600'}>F:{pfcRatios.f}</span>
                    </div>
                    <div className={`text-base font-black ${isDark ? 'text-green-400' : 'text-green-600'}`}>C:{pfcRatios.c}</div>
                  </div>
                </div>

                {/* 右側: PFC詳細リスト */}
                <div className="w-full flex-1 space-y-3">
                  <div className={`p-3 rounded-2xl flex items-center justify-between border ${isDark ? 'bg-blue-900/20 border-blue-900/50' : 'bg-blue-50/50 border-blue-100'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                      <span className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>タンパク質</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <div>
                        <span className={`text-base font-black ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>{Math.round(totals.protein * 10) / 10}</span>
                        <span className={`text-xs ml-1 ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>/ {targets.protein}g</span>
                      </div>
                      <div className={`text-[10px] font-bold mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-md ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-white/60 text-blue-800'}`}>
                        <span className="opacity-70">実績:</span><span className="text-xs">{pfcRatios.p}%</span>
                        <span className="opacity-40">/</span><span className="opacity-70">目標: {currentPfcTarget.p}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-2xl flex items-center justify-between border ${isDark ? 'bg-yellow-900/20 border-yellow-900/50' : 'bg-yellow-50/50 border-yellow-100'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-yellow-400' : 'bg-yellow-500'}`}></div>
                      <span className={`text-sm font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>脂質</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <div>
                        <span className={`text-base font-black ${isDark ? 'text-yellow-100' : 'text-yellow-900'}`}>{Math.round(totals.fat * 10) / 10}</span>
                        <span className={`text-xs ml-1 ${isDark ? 'text-yellow-400/70' : 'text-yellow-600/70'}`}>/ {targets.fat}g</span>
                      </div>
                      <div className={`text-[10px] font-bold mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-md ${isDark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-white/60 text-yellow-800'}`}>
                        <span className="opacity-70">実績:</span><span className="text-xs">{pfcRatios.f}%</span>
                        <span className="opacity-40">/</span><span className="opacity-70">目標: {currentPfcTarget.f}%</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl flex items-center justify-between border ${isDark ? 'bg-green-900/20 border-green-900/50' : 'bg-green-50/50 border-green-100'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-green-400' : 'bg-green-500'}`}></div>
                      <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>炭水化物</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <div>
                        <span className={`text-base font-black ${isDark ? 'text-green-100' : 'text-green-900'}`}>{Math.round(totals.carbs * 10) / 10}</span>
                        <span className={`text-xs ml-1 ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>/ {targets.carbs}g</span>
                      </div>
                      <div className={`text-[10px] font-bold mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-md ${isDark ? 'bg-green-900/40 text-green-300' : 'bg-white/60 text-green-800'}`}>
                        <span className="opacity-70">実績:</span><span className="text-xs">{pfcRatios.c}%</span>
                        <span className="opacity-40">/</span><span className="opacity-70">目標: {currentPfcTarget.c}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 主要栄養素バーグラフ群 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MacroBar label="タンパク質" current={totals.protein} target={targets.protein} colorClass={getLabelColor('blue')} barColorClass={isDark ? 'bg-blue-600' : 'bg-blue-500'} />
                <MacroBar label="脂質" current={totals.fat} target={targets.fat} colorClass={getLabelColor('yellow')} barColorClass={isDark ? 'bg-yellow-600' : 'bg-yellow-500'} />
                <MacroBar label="炭水化物" current={totals.carbs} target={targets.carbs} colorClass={getLabelColor('green')} barColorClass={isDark ? 'bg-green-600' : 'bg-green-500'} />
                <MacroBar label="糖質" current={totals.sugar} target={targets.sugar} colorClass={getLabelColor('purple')} barColorClass={isDark ? 'bg-purple-600' : 'bg-purple-500'} />
                <MacroBar label="食物繊維" current={totals.micros.fiber || 0} target={targets.fiber} colorClass={getLabelColor('teal')} barColorClass={isDark ? 'bg-teal-600' : 'bg-teal-500'} />
                <MacroBar label="塩分" current={totals.micros.salt || 0} target={targets.salt} colorClass={getLabelColor('slate')} barColorClass={isDark ? 'bg-slate-600' : 'bg-slate-500'} />
              </div>

              {/* その他の微量栄養素 (折りたたみ) */}
              <div className="pt-4 mt-4 border-t border-gray-200/20">
                <button 
                  onClick={() => setShowSummaryMicros(!showSummaryMicros)}
                  className={`w-full py-3 flex justify-center items-center gap-1.5 text-sm font-bold rounded-xl transition-colors ${isDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  {showSummaryMicros ? '全ての栄養素を閉じる' : '全ての微量栄養素を見る'}
                  {showSummaryMicros ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {showSummaryMicros && (
                  <div className={`mt-4 pt-4 border-t animate-fade-in-up ${cl.borderBase}`}>
                    <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${cl.textBold}`}>微量栄養素など <span className={`text-xs font-normal px-2 py-0.5 rounded-md ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-400'}`}>{userProfile.gender === 'male' ? '成人男性' : '成人女性'}の目安</span></h3>
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
                              <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{config.label}</span>
                              <span className={`font-medium ${cl.textBold}`}>{Math.round(current * 10) / 10} {config.unit} <span className={`text-[10px] ml-2 ${cl.textMutedLight}`}>({config.recommended ? `目安:${config.recommended}` : ''}{config.recommended && config.upperLimit ? ' / ' : ''}{config.upperLimit ? `上限:${config.upperLimit}` : ''})</span></span>
                            </div>
                            <div className={`relative w-full rounded-full h-2.5 overflow-visible ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                              <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${barColor}`} style={{width: `${currentPercent}%`}}></div>
                              {config.recommended && <div className={`absolute top-[-2px] bottom-[-2px] w-0.5 z-10 ${isDark ? 'bg-slate-100' : 'bg-slate-800'}`} style={{left: `${recommendedPercent}%`}}></div>}
                              {config.upperLimit && <div className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-red-600 z-10" style={{left: `${limitPercent}%`}}></div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={`text-[10px] mt-2 flex gap-3 ${cl.textMutedLight}`}>
                      <span className="flex items-center gap-1"><div className={`w-1 h-3 ${isDark ? 'bg-slate-100' : 'bg-slate-800'}`}></div> 目安量</span>
                      <span className="flex items-center gap-1"><div className="w-1 h-3 bg-red-600"></div> 上限量</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ✨ AI食事アドバイス */}
              <div className={`pt-4 mt-4 border-t ${cl.borderBase}`}>
                 {!aiAdvice && !isAdvicing ? (
                   <button 
                     onClick={handleGetAIAdvice}
                     className="w-full py-4 flex justify-center items-center gap-2 text-sm md:text-base font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl transition-all shadow-md"
                   >
                     <Sparkles className="w-5 h-5 text-yellow-300" />
                     ✨ 今日の食事をAIに分析してもらう
                   </button>
                 ) : (
                   <div className={`p-5 rounded-xl border relative animate-fade-in-up ${isDark ? 'bg-indigo-900/20 border-indigo-800' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100'}`}>
                     <button 
                       onClick={() => setAiAdvice('')} 
                       className={`absolute top-3 right-3 p-2 ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-400 hover:text-indigo-600'}`}
                     >
                       <X className="w-5 h-5" />
                     </button>
                     <h3 className={`text-base font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>
                       <Sparkles className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                       AI栄養士からのアドバイス
                     </h3>
                     {isAdvicing ? (
                       <div className={`flex items-center justify-center gap-3 text-base py-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                         <div className={`animate-spin rounded-full h-5 w-5 border-2 border-t-transparent ${isDark ? 'border-indigo-400' : 'border-indigo-500'}`}></div>
                         今日の記録を分析中...
                       </div>
                     ) : (
                       <div className={`text-base whitespace-pre-wrap leading-relaxed mt-3 ${isDark ? 'text-indigo-100' : 'text-slate-700'}`}>
                         {aiAdvice}
                       </div>
                     )}
                   </div>
                 )}
              </div>
            </section>
          </div>
        )}

        {/* =========================================
            履歴一覧画面
        ========================================= */}
        {currentView === 'history' && (
          <div className="animate-fade-in-up space-y-4">
            <h2 className={`text-lg font-bold px-1 ${cl.textBold}`}>食事の記録</h2>
            {displayMeals.length === 0 ? (
              <div className={`text-center py-16 border-2 border-dashed font-medium rounded-3xl flex flex-col items-center gap-3 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-gray-200 text-gray-400'}`}>
                <Utensils className="w-10 h-10 opacity-50" />
                まだ記録がありません
              </div>
            ) : (
              Object.entries(groupedMeals).map(([type, typeMeals]) => {
                if (typeMeals.length === 0) return null;
                const TypeIcon = MEAL_TYPES[type].icon;
                return (
                  <div key={type} className={`rounded-3xl shadow-sm border overflow-hidden transition-colors ${cl.bgCard} ${cl.borderBase}`}>
                    <div className={`px-5 py-4 flex items-center gap-2 border-b ${isDark ? MEAL_TYPES[type].darkBgColor : MEAL_TYPES[type].bgColor} ${cl.borderBase}`}>
                      <TypeIcon className={`w-6 h-6 ${MEAL_TYPES[type].color}`} /><h3 className={`font-bold text-base ${MEAL_TYPES[type].color}`}>{MEAL_TYPES[type].label}</h3>
                    </div>
                    <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-100'}`}>
                      {typeMeals.map((meal) => {
                        const hasMicros = meal.micros && Object.values(meal.micros).some(val => val > 0);
                        return (
                        <div key={meal.id} className={`p-5 flex items-center justify-between group transition-colors hover:${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                          <div className="flex-1 pr-4 cursor-pointer" onClick={() => openEditModal(meal)}>
                            <div className={`font-bold text-base transition-colors ${cl.textBold} hover:text-indigo-500`}>{meal.name}</div>
                            <div className={`text-sm mt-2 flex gap-4 flex-wrap ${cl.textMuted}`}>
                              <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{meal.calories} kcal</span>
                              <span className={`${isDark ? 'text-blue-400' : 'text-blue-600'} font-medium`}>P:{meal.protein}g</span>
                              <span className={`${isDark ? 'text-yellow-400' : 'text-yellow-600'} font-medium`}>F:{meal.fat}g</span>
                              <span className={`${isDark ? 'text-green-400' : 'text-green-600'} font-medium`}>C:{meal.carbs}g</span>
                            </div>
                            {hasMicros && (
                              <div className={`text-xs mt-2.5 flex gap-2 flex-wrap ${cl.textMutedLight}`}>
                                {Object.entries(currentMicrosConfig).map(([key, config]) => meal.micros[key] > 0 ? <span key={key} className={`px-2 py-1 rounded-md border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-100 border-gray-200'}`}>{config.label}: {meal.micros[key]}{config.unit}</span> : null)}
                              </div>
                            )}
                          </div>
                          <button onClick={() => handleDeleteMeal(meal.id)} className={`p-3 rounded-xl transition-colors flex-shrink-0 border border-transparent ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30 hover:border-red-900/50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200'}`}><Trash2 className="w-6 h-6" /></button>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </main>

      {/* =========================================
          ★ ボトムナビゲーション
      ========================================= */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t flex justify-around items-end px-2 pb-6 pt-2 z-30 transition-colors shadow-[0_-4px_20px_rgba(0,0,0,0.05)] ${cl.bgModal} ${cl.borderBase}`}>
        <button onClick={() => setCurrentView('summary')} className={`flex flex-col items-center p-2 transition-colors flex-1 ${currentView === 'summary' ? 'text-indigo-600' : cl.textMutedLight}`}>
          <Home className={`w-6 h-6 mb-1 ${currentView === 'summary' ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : ''}`} />
          <span className={`text-[10px] font-bold ${currentView === 'summary' ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : ''}`}>ホーム</span>
        </button>
        <button onClick={() => setCurrentView('history')} className={`flex flex-col items-center p-2 transition-colors flex-1 ${currentView === 'history' ? 'text-indigo-600' : cl.textMutedLight}`}>
          <Clock className={`w-6 h-6 mb-1 ${currentView === 'history' ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : ''}`} />
          <span className={`text-[10px] font-bold ${currentView === 'history' ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : ''}`}>食事の記録</span>
        </button>
        
        {/* センターの大きな＋ボタン */}
        <div className="relative -top-5 flex-1 flex justify-center">
          <button 
            onClick={openRecordSheet}
            className="bg-indigo-600 text-white rounded-full p-4 shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all outline-none"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>
        
        <button onClick={() => { setIsSettingsOpen(true); setSettingsTab('database'); }} className={`flex flex-col items-center p-2 transition-colors flex-1 ${cl.textMutedLight} hover:${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
          <Database className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold">データ</span>
        </button>
        <button onClick={() => { setIsSettingsOpen(true); setSettingsTab('profile'); }} className={`flex flex-col items-center p-2 transition-colors flex-1 ${cl.textMutedLight} hover:${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
          <Settings className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold">設定</span>
        </button>
      </nav>

      {/* =========================================
          ★ 入力画面のボトムシート
      ========================================= */}
      {isRecordSheetOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity flex justify-center items-end" onClick={() => setIsRecordSheetOpen(false)}>
          <div 
            className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-t-3xl shadow-2xl transition-transform transform translate-y-0 pb-10 ${cl.bgMain}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex flex-col items-center pt-3 pb-2 bg-gradient-to-b from-inherit to-transparent">
              <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
              <button onClick={() => setIsRecordSheetOpen(false)} className={`absolute right-4 top-4 p-2 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-5 pb-5 space-y-5 animate-fade-in-up">
              <h2 className={`text-xl font-bold ${cl.textBold}`}>食事を記録</h2>
              
              <form onSubmit={handleAddMeal} className="space-y-5">
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(MEAL_TYPES).map(([key, { label, icon: Icon, color, bgColor, darkBgColor }]) => (
                    <button key={key} type="button" onClick={() => setInputType(key)} className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 transition-all ${inputType === key ? `border-indigo-500 ${isDark ? darkBgColor : bgColor}` : `border-transparent ${cl.bgSub} ${cl.bgHover} ${cl.textMuted}`}`}>
                      <Icon className={`w-6 h-6 mb-1.5 ${inputType === key ? color : cl.textMutedLight}`} />
                      <span className={`text-xs font-bold ${inputType === key ? (isDark ? 'text-indigo-300' : 'text-indigo-700') : ''}`}>{label}</span>
                    </button>
                  ))}
                </div>

                {/* メニュー名と検索・タブ切り替えボタン */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className={`block text-sm font-bold ${cl.textBold}`}>メニュー名</label>
                  </div>
                  <div className="flex flex-col gap-3">
                    <input
                      type="text" required value={inputName} onChange={handleNameChange}
                      placeholder="例: マクドナルドのビッグマック"
                      className={`w-full px-4 py-4 text-base border rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow ${cl.bgInput} ${cl.textMain} ${cl.borderInput} ${isDark ? 'placeholder-slate-500' : 'placeholder-gray-400'}`}
                    />
                    
                    <div className="flex gap-2 w-full">
                      <button
                        type="button" onClick={() => handleAISearch('fast')} disabled={isSearching || !inputName}
                        className={`flex-1 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 text-sm p-3 ${isDark ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900/60' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                      >
                        {isSearching && searchMode === 'fast' ? <div className={`animate-spin rounded-full h-5 w-5 border-2 border-t-transparent ${isDark ? 'border-indigo-300' : 'border-indigo-700'}`}></div> : <Zap className="w-5 h-5" />}
                        <span>AI(高速)</span>
                      </button>
                      <button
                        type="button" onClick={() => handleAISearch('detailed')} disabled={isSearching || !inputName}
                        className={`flex-1 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 text-sm p-3 ${isDark ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900/60' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                      >
                        {isSearching && searchMode === 'detailed' ? <div className={`animate-spin rounded-full h-5 w-5 border-2 border-t-transparent ${isDark ? 'border-indigo-300' : 'border-indigo-700'}`}></div> : <Globe className="w-5 h-5" />}
                        <span>AI(詳細)</span>
                      </button>
                    </div>
                  </div>
                  
                  {searchError && <div className="text-red-500 text-sm mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {searchError}</div>}

                  {searchResults && (
                    <div className={`mt-4 p-5 border rounded-2xl shadow-sm animate-fade-up ${isDark ? 'bg-indigo-900/30 border-indigo-800' : 'bg-indigo-50/80 border-indigo-200'}`}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>
                          <Sparkles className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} /> 候補を選択
                        </h3>
                        <button type="button" onClick={() => setSearchResults(null)} className={`p-2 ${isDark ? 'text-indigo-400 hover:text-indigo-200' : 'text-indigo-400 hover:text-indigo-600'}`}>
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                        {searchResults.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSearchResult(item)}
                            className={`text-left px-5 py-4 rounded-xl border hover:shadow-md transition-all group ${isDark ? 'bg-slate-800 border-slate-600 hover:border-indigo-500' : 'bg-white border-indigo-100 hover:border-indigo-400'}`}
                          >
                            <div className={`font-bold text-base transition-colors ${cl.textBold} ${isDark ? 'group-hover:text-indigo-400' : 'group-hover:text-indigo-600'}`}>
                              {item.name}
                            </div>
                            <div className={`text-sm mt-2 flex gap-x-4 gap-y-1 flex-wrap ${cl.textMuted}`}>
                              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.calories} kcal</span>
                              <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>P: {item.protein}g</span>
                              <span className={isDark ? 'text-yellow-400' : 'text-yellow-600'}>F: {item.fat}g</span>
                              <span className={isDark ? 'text-green-400' : 'text-green-600'}>C: {item.carbs}g</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`mt-4 p-4 rounded-2xl border transition-colors ${isEditMode ? (isDark ? 'bg-red-900/20 border-red-900/50' : 'bg-red-50/50 border-red-200') : `${cl.bgSub} ${cl.borderBase}`}`}>
                    <div className={`flex border-b mb-4 overflow-x-auto custom-scrollbar ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                      <button type="button" onClick={() => setActiveInputTab('favorites')} className={`whitespace-nowrap pb-3 px-4 text-sm font-bold flex items-center gap-2 ${activeInputTab === 'favorites' ? `border-b-2 border-indigo-500 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}` : `${cl.textMutedLight} hover:${cl.textBold}`}`}>
                        <Bookmark className="w-4 h-4" /> お気に入り <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-600'}`}>{filteredFavorites.length}</span>
                      </button>
                      <button type="button" onClick={() => setActiveInputTab('mealHistory')} className={`whitespace-nowrap pb-3 px-4 text-sm font-bold flex items-center gap-2 ${activeInputTab === 'mealHistory' ? `border-b-2 border-indigo-500 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}` : `${cl.textMutedLight} hover:${cl.textBold}`}`}>
                        <Clock className="w-4 h-4" /> 食事履歴 <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-600'}`}>{filteredMealHistory.length}</span>
                      </button>
                      <button type="button" onClick={() => setActiveInputTab('aiHistory')} className={`whitespace-nowrap pb-3 px-4 text-sm font-bold flex items-center gap-2 ${activeInputTab === 'aiHistory' ? `border-b-2 border-indigo-500 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}` : `${cl.textMutedLight} hover:${cl.textBold}`}`}>
                        <Search className="w-4 h-4" /> AI検索 <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-600'}`}>{filteredAiHistory.length}</span>
                      </button>
                    </div>

                    {activeInputTab === 'favorites' && favoriteGroups.length > 0 && (
                      <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2">
                        <button 
                          type="button"
                          onClick={() => setActiveFavGroupFilter('all')} 
                          className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${activeFavGroupFilter === 'all' ? 'bg-indigo-500 text-white shadow-md' : `border ${cl.bgCard} ${cl.borderBase} ${cl.textMuted} hover:${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}`}
                        >
                          すべて
                        </button>
                        {favoriteGroups.map(g => (
                          <button 
                            key={g.id}
                            type="button"
                            onClick={() => setActiveFavGroupFilter(g.id)} 
                            className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${activeFavGroupFilter === g.id ? 'bg-indigo-500 text-white shadow-md' : `border ${cl.bgCard} ${cl.borderBase} ${cl.textMuted} hover:${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}`}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-4 min-h-[32px]">
                      <label className={`text-sm font-bold flex items-center gap-1.5 ${isEditMode ? 'text-red-500' : cl.textMuted}`}>
                        {isEditMode ? '削除・移動する項目を選択' : 'タップして記録'}
                      </label>
                      {(activeInputTab === 'favorites' || activeInputTab === 'aiHistory') && (
                        <button 
                          type="button" onClick={() => setIsEditMode(!isEditMode)}
                          className={`text-sm font-bold px-4 py-2 rounded-xl transition-colors border shadow-sm ${isEditMode ? 'bg-red-600 text-white border-red-600' : `${cl.bgCard} ${cl.textMuted} ${cl.borderBase} hover:${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}`}
                        >
                          {isEditMode ? '完了' : '整理する'}
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-2 pb-2">
                      {(() => {
                        let list = [];
                        let icon = null;
                        let emptyMsg = '';
                        let isDeletable = false;
                        let deleteFn = null;

                        if (activeInputTab === 'favorites') {
                          list = filteredFavoritesByGroup;
                          icon = <Bookmark className="w-4 h-4 text-indigo-400" />;
                          emptyMsg = inputName ? '一致するお気に入りはありません。' : 'お気に入りはまだありません。入力を「お気に入り保存」すると追加されます。';
                          isDeletable = true;
                          deleteFn = handleDeleteFavorite;
                        } else if (activeInputTab === 'mealHistory') {
                          list = filteredMealHistory;
                          icon = <Clock className="w-4 h-4 text-emerald-500" />;
                          emptyMsg = inputName ? '一致する食事履歴はありません。' : '食事の記録がまだありません。';
                          isDeletable = false;
                        } else if (activeInputTab === 'aiHistory') {
                          list = filteredAiHistory;
                          icon = <Search className="w-4 h-4 text-blue-400" />;
                          emptyMsg = inputName ? '一致するAI検索履歴はありません。' : 'AI検索を行うと自動で保存されます。';
                          isDeletable = true;
                          deleteFn = handleDeleteSearchHistory;
                        }

                        if (list.length === 0) {
                          return (
                            <div className={`text-sm py-4 flex items-center gap-2 ${cl.textMuted}`}>
                              <AlertCircle className={`w-5 h-5 ${cl.textMutedLight}`} />
                              {emptyMsg}
                            </div>
                          );
                        }

                        return list.map((food, index) => (
                          <div key={index} className="relative w-full flex">
                            <button
                              type="button" 
                              onClick={(e) => {
                                if (!isEditMode || !isDeletable) {
                                  handleDirectAddMeal(food);
                                }
                              }}
                              className={`w-full px-4 py-3 text-sm font-bold rounded-xl border transition-all flex justify-between items-center shadow-sm text-left ${
                                isEditMode && isDeletable
                                  ? `${cl.bgCard} ${cl.textBold} ${cl.borderBase} ${activeInputTab === 'favorites' ? 'pr-20' : 'pr-12'}` 
                                  : `${cl.bgCard} ${cl.textBold} ${cl.borderBase} hover:${isDark ? 'border-indigo-400 bg-slate-800' : 'border-indigo-400 bg-indigo-50'}`
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                {!isEditMode && icon}
                                <span className="truncate">{food.name}</span>
                              </div>
                              <span className={`text-xs ${cl.textMutedLight} whitespace-nowrap ml-2 flex-shrink-0`}>{food.calories} kcal</span>
                            </button>
                            
                            {isEditMode && isDeletable && (
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                                {activeInputTab === 'favorites' && (
                                  <div 
                                    className={`rounded-full p-2 cursor-pointer transition-colors ${isDark ? 'bg-blue-900/50 text-blue-400 hover:bg-blue-600 hover:text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                                    onClick={(e) => { e.stopPropagation(); setMoveTargetItem(food); }}
                                  >
                                    <ArrowRightLeft className="w-4 h-4" />
                                  </div>
                                )}
                                <div 
                                  className={`rounded-full p-2 cursor-pointer transition-colors ${isDark ? 'bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white' : 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white'}`}
                                  onClick={(e) => deleteFn(e, food)}
                                >
                                  <X className="w-4 h-4" />
                                </div>
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                <div className={`border rounded-2xl p-4 ${isDark ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-indigo-50/50 border-indigo-100'}`}>
                  <label className={`block text-sm font-bold mb-3 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>分量を調整</label>
                  <div className="flex flex-wrap items-center gap-3">
                    {[25, 50, 100, 150, 200, 300].map(pct => (
                      <button key={pct} type="button" onClick={() => handleScaleChange(pct)} className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-colors border ${currentScale === pct ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : `${cl.bgCard} ${isDark ? 'text-indigo-300 hover:bg-slate-700' : 'text-indigo-600 hover:bg-indigo-100'} border-indigo-200 shadow-sm`}`}>
                        {pct}%
                      </button>
                    ))}
                    <div className={`flex items-center border rounded-xl overflow-hidden transition-colors h-[44px] ${cl.bgCard} ${![25, 50, 100, 150, 200, 300].includes(currentScale) && currentScale !== 100 ? 'border-indigo-500 ring-2 ring-indigo-500' : (isDark ? 'border-slate-600' : 'border-indigo-200')}`}>
                      <input type="number" className={`w-20 text-sm px-3 py-2 outline-none bg-transparent font-bold ${isDark ? 'text-indigo-300 placeholder-slate-500' : 'text-indigo-800 placeholder-indigo-300'}`} placeholder="任意" value={customScaleInput} onChange={e => setCustomScaleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleScaleChange(parseFloat(customScaleInput)))} />
                      <button type="button" className={`px-3 py-2 text-sm font-bold h-full border-l transition-colors ${isDark ? 'bg-slate-700 text-indigo-300 border-slate-600 hover:bg-slate-600' : 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200'}`} onClick={() => handleScaleChange(parseFloat(customScaleInput))}>%反映</button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div><label className={`block text-sm font-bold mb-1.5 ${getLabelColor('blue')}`}>タンパク質 (g)</label><input type="number" min="0" step="any" value={inputProtein} onChange={handleManualInput(setInputProtein)} className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput} ${isDark ? 'placeholder-slate-500' : 'placeholder-gray-400'}`} placeholder="0" /></div>
                  <div><label className={`block text-sm font-bold mb-1.5 ${getLabelColor('yellow')}`}>脂質 (g)</label><input type="number" min="0" step="any" value={inputFat} onChange={handleManualInput(setInputFat)} className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none text-base transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput} ${isDark ? 'placeholder-slate-500' : 'placeholder-gray-400'}`} placeholder="0" /></div>
                  <div><label className={`block text-sm font-bold mb-1.5 ${getLabelColor('green')}`}>炭水化物 (g)</label><input type="number" min="0" step="any" value={inputCarbs} onChange={handleManualInput(setInputCarbs)} className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-base transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput} ${isDark ? 'placeholder-slate-500' : 'placeholder-gray-400'}`} placeholder="0" /></div>
                </div>

                <div className={`border rounded-xl overflow-hidden ${cl.borderBase} ${cl.bgSub}`}>
                  <button type="button" onClick={() => setShowMicroDetails(!showMicroDetails)} className={`w-full px-5 py-4 flex justify-between items-center text-sm font-bold transition-colors ${cl.textBold} hover:${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    詳細な成分を入力 (任意) {showMicroDetails ? <ChevronUp className={`w-5 h-5 ${cl.textMuted}`} /> : <ChevronDown className={`w-5 h-5 ${cl.textMuted}`} />}
                  </button>
                  {showMicroDetails && (
                    <div className={`p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-72 overflow-y-auto border-t custom-scrollbar ${cl.bgCard} ${cl.borderBase}`}>
                      {Object.entries(currentMicrosConfig).map(([key, config]) => (
                        <div key={key}>
                          <label className={`block text-xs font-bold mb-1.5 truncate ${cl.textMuted}`}>{config.label} ({config.unit})</label>
                          <input type="number" min="0" step="any" value={inputMicros[key] !== undefined ? inputMicros[key] : ''} onChange={(e) => handleMicroChange(key, e.target.value)} className={`w-full px-3 py-2 text-base border rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput} ${isDark ? 'placeholder-slate-500' : 'placeholder-gray-400'}`} placeholder="0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`space-y-4 pt-3 border-t ${cl.borderBase}`}>
                  <div className="flex justify-between items-center mb-1">
                    <label className={`block text-base font-bold ${cl.textBold}`}>カロリー (kcal)</label>
                    <label className={`flex items-center text-sm font-bold cursor-pointer px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><input type="checkbox" checked={autoCalcCal} onChange={(e) => setAutoCalcCal(e.target.checked)} className={`mr-2 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 ${isDark ? 'border-slate-500 bg-slate-800' : 'border-gray-300'}`} /> 自動計算</label>
                  </div>
                  <input type="number" min="0" step="any" required disabled={autoCalcCal} value={inputCalories} onChange={handleManualInput(setInputCalories)} className={`w-full px-5 py-4 border rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput} disabled:opacity-70 ${isDark ? 'disabled:bg-slate-800 placeholder-slate-500' : 'disabled:bg-gray-100 placeholder-gray-400'}`} placeholder="0" />
                  
                  <div className="flex gap-3 pt-3">
                    <div className="w-1/3 flex flex-col gap-2">
                      <select 
                        value={selectedGroupIdForSave} 
                        onChange={e => setSelectedGroupIdForSave(e.target.value)}
                        className={`w-full text-xs font-bold border-2 rounded-xl px-2 py-2 outline-none transition-colors ${isDark ? 'bg-indigo-900/40 text-indigo-300 border-indigo-800' : 'bg-indigo-50/50 text-indigo-700 border-indigo-200'}`}
                      >
                        {favoriteGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <button type="button" onClick={handleAddFavorite} className={`w-full border-2 font-bold py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-sm shadow-sm h-[44px] ${isDark ? 'bg-slate-800 text-indigo-400 border-indigo-800 hover:bg-slate-700' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}>
                        <Bookmark className="w-5 h-5" /> <span>保存</span>
                      </button>
                    </div>
                    <button type="submit" className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-md h-[88px] text-lg">
                      <Plus className="w-6 h-6" /> 完了
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 日ごとの目標カロリー変更モーダル */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in-up" onClick={() => setIsTargetModalOpen(false)}>
          <div className={`rounded-3xl w-full max-w-sm p-6 shadow-2xl ${cl.bgModal} border ${cl.borderBase}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`font-bold text-lg ${cl.textBold}`}>目標カロリーを調整</h3>
              <button onClick={() => setIsTargetModalOpen(false)} className={`p-1.5 rounded-full transition-colors ${cl.bgSub} ${cl.textMuted} hover:${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className={`text-sm mb-4 leading-relaxed ${cl.textMuted}`}>
              追加で運動した際など、この日だけの目標カロリーを変更できます。PFC目標g数も自動で連動して再計算されます。
            </p>

            <div className="mb-6">
              <label className={`block text-xs font-bold mb-1.5 ${cl.textMutedLight}`}>目標カロリー (kcal)</label>
              <input type="number" step="1" value={customCalorieInput} onChange={e => setCustomCalorieInput(e.target.value)} className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xl font-bold text-center transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput}`} />
            </div>

            <div className="flex gap-3">
               <button onClick={handleResetDailyTarget} className={`flex-1 font-bold py-3.5 rounded-xl transition-colors text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                リセット
              </button>
              <button onClick={handleSaveDailyTarget} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md">
                更新する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 設定・内蔵データ確認モーダル */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end sm:items-center p-0 sm:p-4 backdrop-blur-sm transition-all" onClick={() => setIsSettingsOpen(false)}>
          <div 
            className={`rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in-up ${cl.bgModal}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex-shrink-0 z-20 shadow-sm relative ${cl.bgModal}`}>
              <div className={`px-5 py-4 border-b flex justify-between items-center ${cl.bgModal} ${cl.borderBase}`}>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${cl.textBold}`}>
                  <Settings className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  設定
                </h2>
                <button onClick={() => setIsSettingsOpen(false)} className={`p-1.5 rounded-full transition-colors ${cl.bgSub} ${cl.textMuted} hover:${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={`flex border-b px-2 sm:px-5 overflow-x-auto custom-scrollbar ${cl.bgModal} ${cl.borderBase}`}>
                <button 
                  onClick={() => setSettingsTab('profile')} 
                  className={`pb-3 pt-4 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 flex-1 justify-center transition-colors whitespace-nowrap ${settingsTab === 'profile' ? `border-b-2 border-indigo-500 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}` : `${cl.textMutedLight} hover:${cl.textBold}`}`}
                >
                  <User className="w-4 h-4" /> 目標設定
                </button>
                <button 
                  onClick={() => setSettingsTab('times')} 
                  className={`pb-3 pt-4 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 flex-1 justify-center transition-colors whitespace-nowrap ${settingsTab === 'times' ? `border-b-2 border-indigo-500 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}` : `${cl.textMutedLight} hover:${cl.textBold}`}`}
                >
                  <Clock className="w-4 h-4" /> 時間設定
                </button>
                <button 
                  onClick={() => setSettingsTab('folders')} 
                  className={`pb-3 pt-4 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 flex-1 justify-center transition-colors whitespace-nowrap ${settingsTab === 'folders' ? `border-b-2 border-indigo-500 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}` : `${cl.textMutedLight} hover:${cl.textBold}`}`}
                >
                  <Folder className="w-4 h-4" /> グループ設定
                </button>
                <button 
                  onClick={() => setSettingsTab('database')} 
                  className={`pb-3 pt-4 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 flex-1 justify-center transition-colors whitespace-nowrap ${settingsTab === 'database' ? `border-b-2 border-indigo-500 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}` : `${cl.textMutedLight} hover:${cl.textBold}`}`}
                >
                  <Database className="w-4 h-4" /> 内蔵データ
                </button>
              </div>
            </div>

            <div className={`overflow-y-auto custom-scrollbar flex-1 relative ${cl.bgMain}`}>
              {settingsTab === 'profile' && (
                <div className="p-5 space-y-6">
                  <div className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <Monitor className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <div className={`font-bold text-sm ${cl.textBold}`}>ダークモード</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={tempProfile.theme === 'dark'} 
                        onChange={e => setTempProfile({ ...tempProfile, theme: e.target.checked ? 'dark' : 'light' })}
                      />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${tempProfile.theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                    </label>
                  </div>

                  <div className={`p-4 rounded-xl text-sm leading-relaxed border transition-colors ${isDark ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-800 border-indigo-100'}`}>
                    身長や体重などの情報を入力することで、1日のメンテナンスカロリー（消費カロリー）を算出し、最適なPFCバランスを設定します。
                  </div>

                  <div className="space-y-4">
                    <h3 className={`font-bold border-b pb-2 ${cl.textBold} ${cl.borderBase}`}>基本情報</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-bold mb-1 ${cl.textMuted}`}>性別</label>
                        <select 
                          value={tempProfile.gender} onChange={e => setTempProfile({...tempProfile, gender: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput}`}
                        >
                          <option value="male">男性</option>
                          <option value="female">女性</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-bold mb-1 ${cl.textMuted}`}>年齢</label>
                        <input 
                          type="number" min="0" value={tempProfile.age} onChange={e => setTempProfile({...tempProfile, age: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput} ${isDark ? 'placeholder-slate-500' : 'placeholder-gray-400'}`} placeholder="歳"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-bold mb-1 ${cl.textMuted}`}>身長 (cm)</label>
                        <input 
                          type="number" min="0" step="any" value={tempProfile.height} onChange={e => setTempProfile({...tempProfile, height: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput} ${isDark ? 'placeholder-slate-500' : 'placeholder-gray-400'}`} placeholder="170"
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold mb-1 ${cl.textMuted}`}>体重 (kg)</label>
                        <input 
                          type="number" min="0" step="any" value={tempProfile.weight} onChange={e => setTempProfile({...tempProfile, weight: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput} ${isDark ? 'placeholder-slate-500' : 'placeholder-gray-400'}`} placeholder="65"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${cl.textMuted}`}>体脂肪率 (%) <span className={`text-[10px] font-normal ${cl.textMutedLight}`}>※任意（より正確に計算）</span></label>
                      <input 
                        type="number" min="0" step="any" value={tempProfile.bodyFat} onChange={e => setTempProfile({...tempProfile, bodyFat: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput} ${isDark ? 'placeholder-slate-500' : 'placeholder-gray-400'}`} placeholder="未入力でOK"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className={`font-bold border-b pb-2 flex items-center gap-2 ${cl.textBold} ${cl.borderBase}`}>
                      <Activity className="w-4 h-4 text-orange-500" />
                      運動量から推定される消費カロリー
                    </h3>
                    <div className="grid gap-2">
                      {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTempProfile({...tempProfile, activityLevel: key})}
                          className={`text-left p-3 rounded-xl border-2 transition-all ${tempProfile.activityLevel === key ? `border-indigo-500 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-50'}` : `border-transparent ${cl.bgCard} shadow-sm hover:${isDark ? 'border-indigo-500/50' : 'border-indigo-200'}`}`}
                        >
                          <div className={`font-bold text-sm ${tempProfile.activityLevel === key ? (isDark ? 'text-indigo-300' : 'text-indigo-800') : cl.textBold}`}>{level.label}</div>
                          <div className={`text-xs mt-1 ${tempProfile.activityLevel === key ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : cl.textMuted}`}>{level.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className={`font-bold border-b pb-2 flex items-center gap-2 mt-4 ${cl.textBold} ${cl.borderBase}`}>
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
                          className={`text-left p-3 rounded-xl border-2 transition-all ${tempProfile.goal === key ? `border-indigo-500 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-50'}` : `border-transparent ${cl.bgCard} shadow-sm hover:${isDark ? 'border-indigo-500/50' : 'border-indigo-200'}`}`}
                        >
                          <div className="flex justify-between items-center">
                            <div className={`font-bold text-sm ${tempProfile.goal === key ? (isDark ? 'text-indigo-300' : 'text-indigo-800') : cl.textBold}`}>{preset.label}</div>
                            {key !== 'custom' && (
                              <div className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>P:{preset.p}% F:{preset.f}% C:{preset.c}%</div>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${tempProfile.goal === key ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : cl.textMuted}`}>{preset.description}</div>
                        </button>
                      ))}
                    </div>

                    <div className={`mt-4 p-4 rounded-xl border transition-colors ${cl.bgSub} ${cl.borderBase}`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-xs font-bold ${cl.textMuted}`}>PFC割合を設定</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          ((tempProfile.pfcTarget?.p || 0) + (tempProfile.pfcTarget?.f || 0) + (tempProfile.pfcTarget?.c || 0)) === 100 
                            ? (isDark ? 'text-green-300 bg-green-900/40' : 'text-green-700 bg-green-100') 
                            : (isDark ? 'text-red-300 bg-red-900/40' : 'text-red-700 bg-red-100')
                        }`}>
                          合計: {((tempProfile.pfcTarget?.p || 0) + (tempProfile.pfcTarget?.f || 0) + (tempProfile.pfcTarget?.c || 0))}%
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {['p', 'f', 'c'].map(macro => (
                          <div key={macro} className="flex-1">
                            <label className={`block text-[10px] font-bold mb-1 text-center ${cl.textMutedLight}`}>
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
                                className={`w-full px-2 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-center pr-5 transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput}`} 
                              />
                              <span className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-medium ${cl.textMutedLight}`}>%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl shadow-sm sticky bottom-0 z-10 mt-6 border transition-colors ${cl.bgCard} ${isDark ? 'border-slate-600' : 'border-indigo-200'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-sm font-bold ${cl.textMuted}`}>あなたのメンテナンスカロリー</span>
                      <span className={`text-2xl font-black ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
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
                        <span className={`text-sm font-medium ml-1 ${cl.textMutedLight}`}>kcal</span>
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
                      className={`w-full font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors disabled:opacity-50 ${isDark ? 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500'}`}
                    >
                      <Save className="w-5 h-5" /> 設定を保存して適用
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'times' && (
                <div className="p-5 space-y-4">
                  <div className={`p-4 rounded-xl text-sm leading-relaxed border transition-colors ${isDark ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-800 border-indigo-100'}`}>
                    記録する時間帯によって、朝食・昼食・夕食を自動で選択します。指定した時間以外は「間食」になります。
                  </div>
                  <div className="space-y-4">
                    {['breakfast', 'lunch', 'dinner'].map(type => {
                      const TypeIcon = MEAL_TYPES[type].icon;
                      return (
                        <div key={type} className={`p-4 border rounded-xl shadow-sm transition-colors ${cl.bgCard} ${cl.borderBase}`}>
                          <label className={`block text-sm font-bold mb-3 flex items-center gap-2 ${cl.textBold}`}>
                            <TypeIcon className={`w-5 h-5 ${MEAL_TYPES[type].color}`} />
                            {MEAL_TYPES[type].label}の時間
                          </label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="time" 
                              value={tempProfile.mealTimes?.[type]?.start || defaultProfile.mealTimes[type].start}
                              onChange={(e) => {
                                const newTimes = { ...(tempProfile.mealTimes || defaultProfile.mealTimes) };
                                newTimes[type] = { ...newTimes[type], start: e.target.value };
                                setTempProfile({ ...tempProfile, mealTimes: newTimes });
                              }}
                              className={`flex-1 px-3 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-base font-bold text-center transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput}`} 
                            />
                            <span className={`font-bold ${cl.textMutedLight}`}>〜</span>
                            <input 
                              type="time" 
                              value={tempProfile.mealTimes?.[type]?.end || defaultProfile.mealTimes[type].end}
                              onChange={(e) => {
                                const newTimes = { ...(tempProfile.mealTimes || defaultProfile.mealTimes) };
                                newTimes[type] = { ...newTimes[type], end: e.target.value };
                                setTempProfile({ ...tempProfile, mealTimes: newTimes });
                              }}
                              className={`flex-1 px-3 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-base font-bold text-center transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput}`} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={`p-4 rounded-xl shadow-sm sticky bottom-0 z-10 mt-6 border transition-colors ${cl.bgCard} ${isDark ? 'border-slate-600' : 'border-indigo-200'}`}>
                    <button 
                      onClick={handleSaveProfile}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors"
                    >
                      <Save className="w-5 h-5" /> 時間設定を保存
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'folders' && (
                <div className="p-5 space-y-4">
                  <div className={`p-4 rounded-xl text-sm leading-relaxed border transition-colors ${isDark ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-800 border-indigo-100'}`}>
                    お気に入りを整理するためのグループ（フォルダ）の名前を自由に変更できます。
                  </div>
                  <div className="space-y-4">
                    {tempProfile.favoriteGroups && tempProfile.favoriteGroups.map((g, idx) => (
                      <div key={g.id}>
                        <label className={`block text-xs font-bold mb-1 ${cl.textMuted}`}>グループ {idx + 1}</label>
                        <input 
                          type="text" 
                          value={g.name} 
                          onChange={e => {
                            const newGroups = [...tempProfile.favoriteGroups];
                            newGroups[idx].name = e.target.value;
                            setTempProfile({...tempProfile, favoriteGroups: newGroups});
                          }}
                          className={`w-full px-3 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-base font-bold transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput}`} 
                        />
                      </div>
                    ))}
                  </div>
                  <div className={`p-4 rounded-xl shadow-sm sticky bottom-0 z-10 mt-6 border transition-colors ${cl.bgCard} ${isDark ? 'border-slate-600' : 'border-indigo-200'}`}>
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
                  <p className={`text-sm mb-4 leading-relaxed ${cl.textMutedLight}`}>
                    「AI(高速)」で検索した際、API通信を行わずに即座に読み込まれる基本データのリスト（{LOCAL_FOOD_DATABASE.length}件）です。タップすると詳細な栄養素を確認できます。
                  </p>
                  <div className="space-y-3">
                    {LOCAL_FOOD_DATABASE.map((food, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 border rounded-xl shadow-sm transition-colors cursor-pointer ${cl.bgCard} ${cl.borderBase} hover:${isDark ? 'border-indigo-500 bg-slate-700/50' : 'border-indigo-200 bg-gray-50'}`}
                        onClick={() => setExpandedFoodIdx(expandedFoodIdx === idx ? null : idx)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className={`font-bold text-base ${cl.textBold}`}>{food.name}</div>
                          {expandedFoodIdx === idx ? <ChevronUp className={`w-5 h-5 ${cl.textMuted}`} /> : <ChevronDown className={`w-5 h-5 ${cl.textMuted}`} />}
                        </div>
                        <div className={`text-sm flex gap-3 flex-wrap ${cl.textMuted}`}>
                          <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{food.calories} kcal</span>
                          <span className={`${isDark ? 'text-blue-400' : 'text-blue-600'} font-medium`}>P:{food.protein}g</span>
                          <span className={`${isDark ? 'text-yellow-400' : 'text-yellow-600'} font-medium`}>F:{food.fat}g</span>
                          <span className={`${isDark ? 'text-green-400' : 'text-green-600'} font-medium`}>C:{food.carbs}g</span>
                        </div>
                        
                        {/* 詳細表示エリア（アコーディオン） */}
                        {expandedFoodIdx === idx && (
                          <div className={`mt-3 pt-3 border-t animate-fade-in-up ${cl.borderBase}`}>
                            <h4 className={`text-xs font-bold mb-2 ${cl.textMutedLight}`}>微量栄養素</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(food.micros).map(([key, val]) => {
                                if (!val || !currentMicrosConfig[key]) return null;
                                return (
                                  <span key={key} className={`text-xs px-2.5 py-1 rounded-md border ${isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                    {currentMicrosConfig[key].label}: {val}{currentMicrosConfig[key].unit}
                                  </span>
                                );
                              })}
                              {Object.keys(food.micros).length === 0 && (
                                <span className={`text-xs ${cl.textMutedLight}`}>詳細データがありません</span>
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

      {/* 記録アイテムの分量調整モーダル */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in-up" onClick={() => setEditingMeal(null)}>
          <div className={`rounded-3xl w-full max-w-sm p-6 shadow-2xl ${cl.bgModal} border ${cl.borderBase}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`font-bold text-lg truncate pr-4 ${cl.textBold}`}>{editingMeal.name}</h3>
              <button onClick={() => setEditingMeal(null)} className={`p-1.5 rounded-full transition-colors ${cl.bgSub} ${cl.textMuted} hover:${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className={`border rounded-2xl p-4 mb-5 ${isDark ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-indigo-50/50 border-indigo-100'}`}>
              <label className={`block text-sm font-bold mb-3 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>分量を調整して上書き</label>
              <div className="flex flex-wrap items-center gap-2.5">
                {[25, 50, 100, 150, 200, 300].map(pct => (
                  <button key={pct} type="button" onClick={() => handleEditScaleChange(pct)} className={`px-3 py-2 text-sm font-bold rounded-xl transition-colors border ${editScale === pct ? 'bg-indigo-500 text-white border-indigo-500' : `${cl.bgCard} ${isDark ? 'text-indigo-300 hover:bg-slate-700' : 'text-indigo-600 hover:bg-indigo-100'} border-indigo-200`}`}>
                    {pct}%
                  </button>
                ))}
                <div className={`flex items-center border rounded-xl overflow-hidden transition-colors h-[36px] ${cl.bgCard} ${![25, 50, 100, 150, 200, 300].includes(editScale) && editScale !== 100 ? 'border-indigo-500 ring-1 ring-indigo-500' : (isDark ? 'border-slate-600' : 'border-indigo-200')}`}>
                  <input type="number" className={`w-16 text-sm px-2 py-1.5 outline-none bg-transparent font-bold ${isDark ? 'text-indigo-300 placeholder-slate-500' : 'text-indigo-800 placeholder-indigo-300'}`} placeholder="任意" value={customEditScaleInput} onChange={e => setCustomEditScaleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleEditScaleChange(parseFloat(customEditScaleInput)))} />
                  <button type="button" className={`px-2 py-1.5 text-xs font-bold h-full border-l transition-colors ${isDark ? 'bg-slate-700 text-indigo-300 border-slate-600 hover:bg-slate-600' : 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200'}`} onClick={() => handleEditScaleChange(parseFloat(customEditScaleInput))}>%反映</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-6">
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 ${cl.textMuted}`}>カロリー</label>
                <input type="number" step="any" value={editingMeal.calories} onChange={e => setEditingMeal({...editingMeal, calories: e.target.value})} className={`w-full px-2 py-2.5 border rounded-xl text-sm font-bold text-center transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput}`} />
              </div>
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 ${getLabelColor('blue')}`}>P (g)</label>
                <input type="number" step="any" value={editingMeal.protein} onChange={e => setEditingMeal({...editingMeal, protein: e.target.value})} className={`w-full px-2 py-2.5 border rounded-xl text-sm font-bold text-center transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput}`} />
              </div>
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 ${getLabelColor('yellow')}`}>F (g)</label>
                <input type="number" step="any" value={editingMeal.fat} onChange={e => setEditingMeal({...editingMeal, fat: e.target.value})} className={`w-full px-2 py-2.5 border rounded-xl text-sm font-bold text-center transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput}`} />
              </div>
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 ${getLabelColor('green')}`}>C (g)</label>
                <input type="number" step="any" value={editingMeal.carbs} onChange={e => setEditingMeal({...editingMeal, carbs: e.target.value})} className={`w-full px-2 py-2.5 border rounded-xl text-sm font-bold text-center transition-colors ${cl.bgInput} ${cl.textMain} ${cl.borderInput}`} />
              </div>
            </div>

            <button onClick={handleSaveEditedMeal} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md">
              更新する
            </button>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-2xl text-base font-bold shadow-2xl z-50 animate-toast whitespace-nowrap flex items-center gap-2 ${isDark ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-white'}`}>
          <Sparkles className="w-5 h-5 text-yellow-400" />{toastMessage}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        @keyframes toastFade { from { opacity: 0; transform: translate(-50%, 15px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-toast { animation: toastFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}
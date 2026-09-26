/* Recomp: food list. Values are typical averages; labels on your own packaging win.
   Row: [id, name, category, unit, per, kcal, protein (g), default amount]
   Gram and ml items are per 100; countable items are per 1 unit. */
(function (R) {
  'use strict';

  const rows = [
    // Meat and fish
    ['chicken-breast', 'Chicken breast, cooked', 'Meat and fish', 'g', 100, 165, 31, 150],
    ['chicken-thigh', 'Chicken thigh, cooked, skinless', 'Meat and fish', 'g', 100, 209, 26, 150],
    ['turkey-breast', 'Turkey breast, cooked', 'Meat and fish', 'g', 100, 135, 30, 150],
    ['beef-mince-lean', 'Lean beef mince 5%, cooked', 'Meat and fish', 'g', 100, 175, 26, 125],
    ['beef-mince', 'Beef mince 15%, cooked', 'Meat and fish', 'g', 100, 250, 25, 125],
    ['steak', 'Sirloin steak, cooked', 'Meat and fish', 'g', 100, 205, 29, 200],
    ['pork-tenderloin', 'Pork tenderloin, cooked', 'Meat and fish', 'g', 100, 145, 26, 150],
    ['ham', 'Ham, sliced', 'Meat and fish', 'g', 100, 110, 18, 50],
    ['bacon', 'Bacon, cooked', 'Meat and fish', 'slice', 1, 43, 3, 2],
    ['smoked-sausage', 'Smoked sausage', 'Meat and fish', 'g', 100, 290, 12, 100],
    ['salmon', 'Salmon, cooked', 'Meat and fish', 'g', 100, 206, 22, 125],
    ['tuna', 'Tuna in water, drained', 'Meat and fish', 'g', 100, 116, 26, 110],
    ['cod', 'Cod, cooked', 'Meat and fish', 'g', 100, 105, 23, 150],
    ['prawns', 'Prawns, cooked', 'Meat and fish', 'g', 100, 99, 24, 100],

    // Dairy and eggs
    ['egg', 'Egg, large', 'Dairy and eggs', 'piece', 1, 78, 6.3, 2],
    ['egg-white', 'Egg white', 'Dairy and eggs', 'piece', 1, 17, 3.6, 3],
    ['quark', 'Low-fat quark (magere kwark)', 'Dairy and eggs', 'g', 100, 58, 10, 250],
    ['skyr', 'Skyr, plain', 'Dairy and eggs', 'g', 100, 63, 11, 150],
    ['greek-yogurt-0', 'Greek yogurt 0%', 'Dairy and eggs', 'g', 100, 59, 10, 150],
    ['greek-yogurt-5', 'Greek yogurt 5%', 'Dairy and eggs', 'g', 100, 97, 9, 150],
    ['yogurt', 'Plain yogurt, semi-skimmed', 'Dairy and eggs', 'g', 100, 48, 4, 150],
    ['milk-skim', 'Skimmed milk', 'Dairy and eggs', 'ml', 100, 35, 3.5, 250],
    ['milk-semi', 'Semi-skimmed milk', 'Dairy and eggs', 'ml', 100, 46, 3.5, 250],
    ['milk-whole', 'Whole milk', 'Dairy and eggs', 'ml', 100, 64, 3.3, 250],
    ['cottage-cheese', 'Cottage cheese', 'Dairy and eggs', 'g', 100, 98, 11, 150],
    ['gouda', 'Gouda cheese 48+', 'Dairy and eggs', 'g', 100, 356, 25, 30],
    ['cheese-light', 'Light cheese 30+', 'Dairy and eggs', 'g', 100, 265, 29, 30],
    ['mozzarella', 'Mozzarella', 'Dairy and eggs', 'g', 100, 250, 18, 60],
    ['feta', 'Feta', 'Dairy and eggs', 'g', 100, 264, 14, 50],

    // Plant protein
    ['tofu', 'Tofu, firm', 'Plant protein', 'g', 100, 130, 14, 150],
    ['tempeh', 'Tempeh', 'Plant protein', 'g', 100, 192, 20, 100],
    ['lentils', 'Lentils, cooked', 'Plant protein', 'g', 100, 116, 9, 150],
    ['chickpeas', 'Chickpeas, cooked or canned', 'Plant protein', 'g', 100, 139, 7, 150],
    ['kidney-beans', 'Kidney beans, cooked', 'Plant protein', 'g', 100, 127, 8.7, 150],
    ['edamame', 'Edamame', 'Plant protein', 'g', 100, 121, 12, 100],

    // Grains and starches
    ['rice-cooked', 'White rice, cooked', 'Grains and starches', 'g', 100, 130, 2.7, 200],
    ['rice-dry', 'White rice, dry', 'Grains and starches', 'g', 100, 360, 7, 75],
    ['brown-rice', 'Brown rice, cooked', 'Grains and starches', 'g', 100, 123, 2.6, 200],
    ['pasta-cooked', 'Pasta, cooked', 'Grains and starches', 'g', 100, 158, 5.8, 200],
    ['pasta-dry', 'Pasta, dry', 'Grains and starches', 'g', 100, 357, 12.5, 90],
    ['noodles', 'Egg noodles, cooked', 'Grains and starches', 'g', 100, 138, 4.5, 200],
    ['couscous', 'Couscous, cooked', 'Grains and starches', 'g', 100, 112, 3.8, 150],
    ['quinoa', 'Quinoa, cooked', 'Grains and starches', 'g', 100, 120, 4.4, 150],
    ['oats', 'Oats', 'Grains and starches', 'g', 100, 379, 13, 60],
    ['granola', 'Granola', 'Grains and starches', 'g', 100, 450, 9, 50],
    ['cornflakes', 'Cornflakes', 'Grains and starches', 'g', 100, 378, 7, 40],
    ['potato', 'Potatoes, boiled', 'Grains and starches', 'g', 100, 87, 1.9, 250],
    ['sweet-potato', 'Sweet potato, baked', 'Grains and starches', 'g', 100, 90, 2, 200],
    ['bread-wholemeal', 'Wholemeal bread', 'Grains and starches', 'slice', 1, 80, 3.5, 2],
    ['bread-white', 'White bread', 'Grains and starches', 'slice', 1, 90, 3, 2],
    ['bagel', 'Bagel', 'Grains and starches', 'piece', 1, 250, 10, 1],
    ['wrap', 'Tortilla wrap', 'Grains and starches', 'piece', 1, 185, 5, 1],
    ['rice-cake', 'Rice cake', 'Grains and starches', 'piece', 1, 28, 0.6, 2],
    ['rusk', 'Rusk (beschuit)', 'Grains and starches', 'piece', 1, 37, 1.3, 2],

    // Fruit
    ['banana', 'Banana, medium', 'Fruit', 'piece', 1, 105, 1.3, 1],
    ['apple', 'Apple, medium', 'Fruit', 'piece', 1, 95, 0.5, 1],
    ['orange', 'Orange', 'Fruit', 'piece', 1, 62, 1.2, 1],
    ['pear', 'Pear', 'Fruit', 'piece', 1, 100, 0.6, 1],
    ['mandarin', 'Mandarin', 'Fruit', 'piece', 1, 40, 0.6, 2],
    ['kiwi', 'Kiwi', 'Fruit', 'piece', 1, 42, 0.8, 1],
    ['berries', 'Berries, mixed', 'Fruit', 'g', 100, 45, 0.8, 125],
    ['grapes', 'Grapes', 'Fruit', 'g', 100, 69, 0.7, 100],
    ['mango', 'Mango', 'Fruit', 'g', 100, 60, 0.8, 150],
    ['raisins', 'Raisins', 'Fruit', 'g', 100, 299, 3, 30],

    // Vegetables
    ['broccoli', 'Broccoli', 'Vegetables', 'g', 100, 35, 2.4, 150],
    ['green-beans', 'Green beans', 'Vegetables', 'g', 100, 31, 1.8, 150],
    ['spinach', 'Spinach', 'Vegetables', 'g', 100, 23, 2.9, 100],
    ['stir-fry-veg', 'Stir-fry vegetables', 'Vegetables', 'g', 100, 35, 2, 200],
    ['salad', 'Mixed salad', 'Vegetables', 'g', 100, 17, 1.2, 100],
    ['carrots', 'Carrots', 'Vegetables', 'g', 100, 41, 0.9, 100],
    ['mushrooms', 'Mushrooms', 'Vegetables', 'g', 100, 22, 3.1, 100],
    ['cucumber', 'Cucumber', 'Vegetables', 'g', 100, 15, 0.7, 100],
    ['tomato', 'Tomato', 'Vegetables', 'piece', 1, 22, 1.1, 1],
    ['bell-pepper', 'Bell pepper', 'Vegetables', 'piece', 1, 37, 1.4, 1],

    // Fats, nuts and spreads
    ['olive-oil', 'Olive oil', 'Fats, nuts and spreads', 'tbsp', 1, 119, 0, 1],
    ['butter', 'Butter', 'Fats, nuts and spreads', 'g', 100, 717, 0.9, 10],
    ['peanut-butter', 'Peanut butter', 'Fats, nuts and spreads', 'tbsp', 1, 95, 4, 1],
    ['mayonnaise', 'Mayonnaise', 'Fats, nuts and spreads', 'tbsp', 1, 100, 0.1, 1],
    ['hazelnut-spread', 'Chocolate hazelnut spread', 'Fats, nuts and spreads', 'tbsp', 1, 100, 1, 1],
    ['sprinkles', 'Chocolate sprinkles (hagelslag)', 'Fats, nuts and spreads', 'g', 100, 480, 5, 15],
    ['almonds', 'Almonds', 'Fats, nuts and spreads', 'g', 100, 579, 21, 30],
    ['mixed-nuts', 'Mixed nuts', 'Fats, nuts and spreads', 'g', 100, 607, 20, 30],
    ['avocado', 'Avocado', 'Fats, nuts and spreads', 'g', 100, 160, 2, 70],
    ['hummus', 'Hummus', 'Fats, nuts and spreads', 'g', 100, 250, 7, 30],

    // Snacks and sweets
    ['dark-chocolate', 'Dark chocolate 70%', 'Snacks and sweets', 'g', 100, 600, 8, 20],
    ['milk-chocolate', 'Milk chocolate', 'Snacks and sweets', 'g', 100, 535, 7.7, 25],
    ['crisps', 'Crisps', 'Snacks and sweets', 'g', 100, 536, 6, 30],
    ['gummies', 'Sweets, gummies', 'Snacks and sweets', 'g', 100, 340, 6, 30],
    ['ice-cream', 'Ice cream', 'Snacks and sweets', 'g', 100, 200, 3.5, 100],
    ['stroopwafel', 'Stroopwafel', 'Snacks and sweets', 'piece', 1, 130, 1, 1],
    ['biscuit', 'Biscuit or cookie', 'Snacks and sweets', 'piece', 1, 70, 1, 2],
    ['croissant', 'Croissant', 'Snacks and sweets', 'piece', 1, 230, 4.6, 1],
    ['cake', 'Cake', 'Snacks and sweets', 'slice', 1, 300, 4, 1],
    ['muesli-bar', 'Muesli bar', 'Snacks and sweets', 'bar', 1, 110, 1.5, 1],

    // Drinks
    ['water', 'Water, black coffee or tea', 'Drinks', 'cup', 1, 2, 0, 1],
    ['coffee-milk', 'Coffee with milk', 'Drinks', 'cup', 1, 20, 1, 1],
    ['cappuccino', 'Cappuccino', 'Drinks', 'cup', 1, 90, 5, 1],
    ['orange-juice', 'Orange juice', 'Drinks', 'ml', 100, 45, 0.7, 250],
    ['cola', 'Cola', 'Drinks', 'ml', 100, 42, 0, 330],
    ['cola-zero', 'Cola zero or diet soda', 'Drinks', 'ml', 100, 0.4, 0, 330],
    ['chocolate-milk', 'Chocolate milk', 'Drinks', 'ml', 100, 83, 3.5, 250],
    ['sports-drink', 'Sports drink', 'Drinks', 'ml', 100, 26, 0, 500],
    ['beer', 'Beer, 5%', 'Drinks', 'ml', 100, 43, 0.5, 330],
    ['wine', 'Wine', 'Drinks', 'glass (150 ml)', 1, 125, 0.1, 1],

    // Meals and takeaway
    ['pizza', 'Pizza', 'Meals and takeaway', 'slice', 1, 280, 12, 2],
    ['burger', 'Burger, fast food', 'Meals and takeaway', 'piece', 1, 520, 26, 1],
    ['fries', 'Fries', 'Meals and takeaway', 'g', 100, 290, 3.4, 150],
    ['doner', 'Döner kebab in bread', 'Meals and takeaway', 'piece', 1, 700, 35, 1],
    ['burrito', 'Burrito', 'Meals and takeaway', 'piece', 1, 650, 30, 1],
    ['sushi', 'Sushi', 'Meals and takeaway', 'piece', 1, 45, 2, 8],
    ['sandwich', 'Sandwich, cheese or ham', 'Meals and takeaway', 'piece', 1, 350, 18, 1],
    ['lasagne', 'Lasagne', 'Meals and takeaway', 'g', 100, 140, 8, 350],
    ['pasta-bolognese', 'Pasta bolognese', 'Meals and takeaway', 'plate', 1, 650, 30, 1],
    ['chicken-curry', 'Chicken curry with rice', 'Meals and takeaway', 'plate', 1, 650, 35, 1],
    ['chicken-salad', 'Salad bowl with chicken', 'Meals and takeaway', 'bowl', 1, 450, 35, 1],

    // Supplements
    ['whey', 'Whey protein', 'Supplements', 'scoop (30 g)', 1, 120, 24, 1],
    ['casein', 'Casein protein', 'Supplements', 'scoop (30 g)', 1, 115, 24, 1],
    ['protein-bar', 'Protein bar', 'Supplements', 'bar', 1, 200, 20, 1],
    ['protein-pudding', 'Protein pudding', 'Supplements', 'cup (200 g)', 1, 150, 20, 1],
  ];

  R.FOODS = rows.map(([id, name, cat, unit, per, kcal, p, def]) => ({ id, name, cat, unit, per, kcal, p, def }));

  R.FOOD_CATEGORIES = [];
  R.FOODS.forEach((f) => { if (!R.FOOD_CATEGORIES.includes(f.cat)) R.FOOD_CATEGORIES.push(f.cat); });

  /** Look up built-in or custom food ('custom:<id>') */
  R.foodById = (id) => {
    if (!id) return null;
    if (id.startsWith('custom:')) {
      const cid = id.slice(7);
      const c = (R.state && R.state.customFoods || []).find((x) => x.id === cid);
      return c ? { id, name: c.name, cat: 'My foods', unit: c.unit, per: c.per, kcal: c.kcal, p: c.p, def: c.def } : null;
    }
    return R.FOODS.find((f) => f.id === id) || null;
  };

  /** Energy and protein for an amount of a food */
  R.foodCalc = (food, qty) => {
    const factor = qty / (food.per || 1);
    return { kcal: Math.round(food.kcal * factor), p: Math.round(food.p * factor * 10) / 10 };
  };

  R.foodOptionsHTML = (selected) => {
    const esc = R.util.esc;
    const groups = [];
    const custom = (R.state && R.state.customFoods) || [];
    if (custom.length) {
      groups.push(`<optgroup label="My foods">${custom
        .map((c) => `<option value="custom:${esc(c.id)}"${'custom:' + c.id === selected ? ' selected' : ''}>${esc(c.name)}</option>`)
        .join('')}</optgroup>`);
    }
    R.FOOD_CATEGORIES.forEach((cat) => {
      groups.push(`<optgroup label="${esc(cat)}">${R.FOODS.filter((f) => f.cat === cat)
        .map((f) => `<option value="${f.id}"${f.id === selected ? ' selected' : ''}>${esc(f.name)}</option>`)
        .join('')}</optgroup>`);
    });
    return groups.join('');
  };
})(window.R);

import { assertAdditionalFoodMonthOpen, syncAdditionalFoodFee } from '../services/additionalFoodBilling.js';
import { Op } from 'sequelize';
import moment from 'moment';
import sequelize from '../config/database.js';
import { User, Role, Hostel, SpecialFoodItem, FoodOrder, FoodOrderItem } from '../models/index.js';
import { normalizeSpecialMeal } from '../utils/specialMealValidation.js';

export async function recordStaffRecordedSpecialFoodConsumption(req, res) {
  try {
    const { studentIds, items } = normalizeSpecialMeal(req.body);
    const date = moment(req.body.consumption_date, 'YYYY-MM-DD', true);
    if (!date.isValid()) return res.status(400).json({ success:false, message:'Select a valid consumption date.' });
    const hostelId = Number(req.user.role === 'admin' ? req.body.hostel_id : req.user.hostel_id);
    if (!Number.isInteger(hostelId) || hostelId <= 0) return res.status(400).json({ success:false, message:'Select a hostel.' });
    const result = await sequelize.transaction(async transaction => {
      const hostel = await Hostel.findByPk(hostelId, {transaction});
      if (!hostel?.is_active) throw new Error('Hostel not found or inactive.');
      await assertAdditionalFoodMonthOpen(hostelId, `${date.format('YYYY-MM-DD')}T12:00:00+05:30`, transaction);
      const roles = await Role.findAll({where:{roleName:{[Op.in]:['Student','student','LAPC','lapc']}},transaction});
      const students = await User.findAll({where:{userId:{[Op.in]:studentIds},hostel_id:hostelId,
        roleId:{[Op.in]:roles.map(r=>r.roleId)},status:true},attributes:['userId'],transaction});
      if(students.length !== studentIds.length) throw new Error('One or more selected students are inactive or outside the selected hostel. Nothing was saved.');
      const foods = await SpecialFoodItem.findAll({where:{id:{[Op.in]:items.map(i=>i.food_item_id)},is_available:true},transaction});
      if(foods.length !== items.length) throw new Error('One or more selected dishes are unavailable. Nothing was saved.');
      const prices=new Map(foods.map(food=>[food.id,Math.round(Number(food.price)*100)]));
      if([...prices.values()].some(price=>!Number.isFinite(price)||price<0)) throw new Error('A selected dish has an invalid price.');
      const itemRows=items.map(item=>{
        const food = foods.find(food => food.id === item.food_item_id);
        return {...item,unit_price:prices.get(item.food_item_id)/100,subtotal:prices.get(item.food_item_id)*item.quantity/100,
          food_name_snapshot: food.name, category_snapshot: food.category, meal_type_snapshot: food.meal_type};
      });
      const cents=items.reduce((sum,item)=>sum+prices.get(item.food_item_id)*item.quantity,0);
      if(!Number.isSafeInteger(cents)||cents>9999999999)throw new Error('The meal amount is too large.');
      const amount=cents/100;
      const orders=[], fees=[];
      for(const studentId of studentIds){
        const order=await FoodOrder.create({order_source:'staff',student_id:studentId,hostel_id:hostelId,requested_time:date.format('YYYY-MM-DD HH:mm:ss'),
          order_date:date.format('YYYY-MM-DD'),total_amount:amount,status:'confirmed',payment_status:'pending',
          notes:req.body.description || `Additional food recorded by staff on ${date.format('DD-MM-YYYY')}`},{transaction});
        await FoodOrderItem.bulkCreate(itemRows.map(item=>({...item,food_order_id:order.id})),{transaction});
        const fee=await syncAdditionalFoodFee(order, transaction, { create: true, issuedBy: req.user.userId });
        orders.push(order);fees.push(fee);
      }
      return {studentCount:studentIds.length,amountPerStudent:amount,totalAmount:cents*studentIds.length/100,
        foodOrders:orders,studentFees:fees,...(!req.body.student_ids?{foodOrder:orders[0],studentFee:fees[0]}:{})};
    });
    return res.status(201).json({success:true,message:`Additional food recorded for ${result.studentCount} students.`,data:result});
  }catch(error){return res.status(400).json({success:false,message:error.message || 'Unable to record the meals.'});}
}

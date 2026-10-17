import { Op } from 'sequelize';
import moment from 'moment';
import sequelize from '../config/database.js';
import { User, Role, Hostel, SpecialFoodItem, FoodOrder, FoodOrderItem, StudentFee, MessBill } from '../models/index.js';
import { getHistoricalBilling } from '../utils/historicalBilling.js';
import { normalizeSpecialMeal } from '../utils/specialMealValidation.js';

export async function recordStaffRecordedSpecialFoodConsumption(req, res) {
  try {
    const { studentIds, items } = normalizeSpecialMeal(req.body);
    const date = moment(req.body.consumption_date, 'YYYY-MM-DD', true);
    if (!date.isValid()) return res.status(400).json({ success:false, message:'Select a valid consumption date.' });
    const hostelId = Number(req.user.role === 'admin' ? req.body.hostel_id : req.user.hostel_id);
    if (!Number.isInteger(hostelId) || hostelId <= 0) return res.status(400).json({ success:false, message:'Select a hostel.' });
    const result = await sequelize.transaction(async transaction => {
      const hostel = await Hostel.findByPk(hostelId, {transaction,lock:transaction.LOCK.UPDATE});
      if (!hostel?.is_active) throw new Error('Hostel not found or inactive.');
      const month = date.month()+1, year = date.year();
      if (await getHistoricalBilling(hostelId,month,year) || await MessBill.count({where:{hostel_id:hostelId,month,year},transaction})) {
        throw new Error('This month already has saved bills or a historical statement. Meal charges cannot be added to it.');
      }
      const roles = await Role.findAll({where:{roleName:{[Op.in]:['Student','student','LAPC','lapc']}},transaction});
      const students = await User.findAll({where:{userId:{[Op.in]:studentIds},hostel_id:hostelId,
        roleId:{[Op.in]:roles.map(r=>r.roleId)},status:true},attributes:['userId'],transaction});
      if(students.length !== studentIds.length) throw new Error('One or more selected students are inactive or outside the selected hostel. Nothing was saved.');
      const foods = await SpecialFoodItem.findAll({where:{id:{[Op.in]:items.map(i=>i.food_item_id)},is_available:true},transaction});
      if(foods.length !== items.length) throw new Error('One or more selected dishes are unavailable. Nothing was saved.');
      const prices=new Map(foods.map(food=>[food.id,Math.round(Number(food.price)*100)]));
      if([...prices.values()].some(price=>!Number.isFinite(price)||price<0)) throw new Error('A selected dish has an invalid price.');
      const itemRows=items.map(item=>({...item,unit_price:prices.get(item.food_item_id)/100,subtotal:prices.get(item.food_item_id)*item.quantity/100}));
      const cents=items.reduce((sum,item)=>sum+prices.get(item.food_item_id)*item.quantity,0);
      if(!Number.isSafeInteger(cents)||cents>9999999999)throw new Error('The meal amount is too large.');
      const amount=cents/100;
      const orders=[], fees=[];
      for(const studentId of studentIds){
        const order=await FoodOrder.create({student_id:studentId,hostel_id:hostelId,requested_time:date.format('YYYY-MM-DD HH:mm:ss'),
          order_date:date.format('YYYY-MM-DD'),total_amount:amount,status:'confirmed',payment_status:'pending',
          notes:req.body.description || `Special meal recorded by staff on ${date.format('DD-MM-YYYY')}`},{transaction});
        await FoodOrderItem.bulkCreate(itemRows.map(item=>({...item,food_order_id:order.id})),{transaction});
        const fee=await StudentFee.create({student_id:studentId,hostel_id:hostelId,fee_type:'special_food_charge',amount,month,year,
          description:`Special meal charges for ${date.format('DD-MM-YYYY')} (Order #${order.id})`,issued_by:req.user.userId},{transaction});
        orders.push(order);fees.push(fee);
      }
      return {studentCount:studentIds.length,amountPerStudent:amount,totalAmount:cents*studentIds.length/100,
        foodOrders:orders,studentFees:fees,...(!req.body.student_ids?{foodOrder:orders[0],studentFee:fees[0]}:{})};
    });
    return res.status(201).json({success:true,message:`Special meals recorded for ${result.studentCount} students.`,data:result});
  }catch(error){return res.status(400).json({success:false,message:error.message || 'Unable to record the meals.'});}
}

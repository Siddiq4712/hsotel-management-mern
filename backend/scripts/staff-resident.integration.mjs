import assert from 'node:assert/strict';
import db from '../config/database.js';
import {ensureResidentSchema} from '../services/residentSchema.js';
import {User,Role,Hostel,Enrollment,initAssociations} from '../models/index.js';
import {allocationPreview} from '../services/batchAllocation.js';
initAssociations();
let transaction;
try{
 await ensureResidentSchema(db);
 const initialCount=await User.count();
 transaction=await db.transaction();
 const role=await Role.findOne({where:{roleName:'Student'},transaction});
 const hostel=await Hostel.findByPk(1,{transaction});assert(role&&hostel);
 const suffix=Date.now();
 const staff=await User.create({userName:'STAFF RESIDENT TEST',userMail:`staff-resident-${suffix}@test.invalid`,password:'not-a-login',roleId:role.roleId,resident_type:'staff',hostel_id:1,status:true},{transaction});
 const enrolled=await Enrollment.create({student_id:staff.userId,hostel_id:1,session_id:null,erp_batch_year:null,college:null,status:'active'},{transaction});
 assert.equal(enrolled.session_id,null);
 const student=await User.create({userName:'STUDENT BATCH TEST',userMail:`student-batch-${suffix}@test.invalid`,password:'not-a-login',roleId:role.roleId,hostel_id:1,status:true},{transaction});
 assert.equal(student.resident_type,'student');
 await assert.rejects(Enrollment.create({student_id:student.userId,hostel_id:1,session_id:null,status:'active'},{transaction}),/academic batch is required/);
 const preview=await allocationPreview(transaction);
 assert(!preview.rows.some(r=>r.student_id===staff.userId),'Staff must not be assigned a fabricated academic batch');
 await transaction.rollback();transaction=null;
 assert.equal(await User.count(),initialCount);
 console.log('PASS: staff can reside without an academic batch; student batch requirement is preserved; staff excluded from batch allocation; fixture records rolled back.');
}finally{if(transaction)await transaction.rollback();await db.close()}

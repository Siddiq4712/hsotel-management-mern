import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Typography, Row, Col, Button, Space, Divider,
  ConfigProvider, theme, Skeleton, Badge, Tag, Result
} from 'antd';
import { 
  Building, Receipt, AlertTriangle, CheckCircle2, 
  ExternalLink, CreditCard, ShieldCheck, Info,
  History, Wallet
} from 'lucide-react';
import { studentAPI } from '../../services/api';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;

const MyHostelFee = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFeeStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getProfile();
      setProfile(response.data.data);
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  }, []);

  useEffect(() => { fetchFeeStatus(); }, [fetchFeeStatus]);

  if (loading) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  const isPending = profile?.Hostel?.show_fee_reminder == 1;
  const annualFee = profile?.Hostel?.annual_fee_amount || 0;

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
            <Building className="text-white" size={24} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0 }}>Hostel Management Fees</Title>
            <Text type="secondary">Academic Session 2024-25 • {profile?.Hostel?.name}</Text>
          </div>
        </div>

        <Row gutter={[24, 24]}>
          {/* Main Fee Card */}
          <Col xs={24} lg={16}>
            <div className="space-y-6">
              <Card 
                className="border-none shadow-sm rounded-[32px] overflow-hidden"
                bodyStyle={{ padding: 0 }}
              >
                <div className={`p-8 ${isPending ? 'bg-orange-50' : 'bg-emerald-50'} border-b border-white`}>
                  <div className="flex justify-between items-start">
                    <Space direction="vertical" size={0}>
                      <Text className="text-[11px] uppercase font-bold tracking-widest text-slate-500">Current Status</Text>
                      <Title level={3} className={isPending ? 'text-orange-600' : 'text-emerald-600'} style={{ margin: 0 }}>
                        {isPending ? 'Payment Pending' : 'Account Cleared'}
                      </Title>
                    </Space>
                    <div className={`p-3 rounded-2xl ${isPending ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {isPending ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-white space-y-6">
                  <Row gutter={40}>
                    <Col span={12}>
                      <Text className="text-slate-400 text-xs block mb-1">ANNUAL FEE AMOUNT</Text>
                      <Title level={2} style={{ margin: 0 }}>₹{parseFloat(annualFee).toLocaleString('en-IN')}</Title>
                    </Col>
                    <Col span={12}>
                      <Text className="text-slate-400 text-xs block mb-1">DUE DATE</Text>
                      <Title level={4} style={{ margin: 0 }}>Term Start 2024</Title>
                    </Col>
                  </Row>

                  <Divider className="my-0" />

                  <div className="bg-slate-50 p-6 rounded-2xl flex items-start gap-4">
                    <Info className="text-blue-500 mt-1" size={20} />
                    <Paragraph className="m-0 text-slate-500 text-sm leading-relaxed">
                      The Hostel Management fee covers institutional maintenance, security protocols, and infrastructure development. 
                      Payments are processed through the official IOB portal. Please keep your transaction ID for verification.
                    </Paragraph>
                  </div>
                </div>
              </Card>

              {/* Transaction History (Static Placeholder for UI consistency) */}
              <Card className="border-none shadow-sm rounded-[32px]" title={<div className="flex items-center gap-2"><History size={18} className="text-blue-600" /><Text strong>Recent Settlements</Text></div>}>
                 {!isPending ? (
                   <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                      <Space>
                        <CheckCircle2 className="text-emerald-500" size={20} />
                        <Text strong>Annual Fee Paid Successfully</Text>
                      </Space>
                      <Text type="secondary">Verified via Accounts Office</Text>
                   </div>
                 ) : (
                   <Result
                    status="info"
                    subTitle="No recent hostel fee transactions found for this academic session."
                    style={{ padding: '20px 0' }}
                   />
                 )}
              </Card>
            </div>
          </Col>

          {/* Action Column */}
          <Col xs={24} lg={8}>
            <div className="sticky top-8 space-y-6">
              <Card className="border-none shadow-lg rounded-[32px] bg-indigo-600 text-white overflow-hidden relative">
                <div className="relative z-10 p-2">
                  <Text className="text-indigo-100 text-[10px] uppercase font-bold tracking-widest block mb-4">Payment Portal</Text>
                  <Title level={4} style={{ color: 'white', marginTop: 0 }}>Official IOB Gateway</Title>
                  <Paragraph className="text-indigo-100 text-xs mb-6">
                    You will be redirected to the Indian Overseas Bank secure payment portal.
                  </Paragraph>
                  <Button 
                    block 
                    size="large" 
                    icon={<ExternalLink size={18} />}
                    className="h-14 rounded-2xl border-none shadow-xl font-bold bg-white text-indigo-600 flex items-center justify-center gap-2"
                    onClick={() => window.open("https://www.iobnet.co.in/iobpay/commonpage.do?type=HOSTEL%20FEES", "_blank")}
                  >
                    Proceed to IOB Pay
                  </Button>
                </div>
                <CreditCard className="absolute -bottom-6 -right-6 text-white opacity-10" size={120} />
              </Card>

              <Card className="border-none shadow-sm rounded-[32px] bg-slate-900 text-slate-300">
                <Title level={5} style={{ color: 'white' }}>Support</Title>
                <Text className="text-slate-400 text-xs block mb-4">For payment issues or receipt generation:</Text>
                <div className="space-y-3">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white"><Receipt size={16}/></div>
                      <Text className="text-slate-300">Accounts Office (Ground Floor)</Text>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white"><ShieldCheck size={16}/></div>
                      <Text className="text-slate-300">Digital Receipt System</Text>
                   </div>
                </div>
              </Card>
            </div>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default MyHostelFee;
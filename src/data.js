export const stocks = [
 ['RELIANCE','Reliance Industries'],['TCS','Tata Consultancy Services'],['HDFCBANK','HDFC Bank'],['ICICIBANK','ICICI Bank'],['INFY','Infosys'],['SBIN','State Bank of India'],['BHARTIARTL','Bharti Airtel'],['ITC','ITC'],['LT','Larsen & Toubro'],['KOTAKBANK','Kotak Mahindra Bank'],['HINDUNILVR','Hindustan Unilever'],['AXISBANK','Axis Bank'],['BAJFINANCE','Bajaj Finance'],['MARUTI','Maruti Suzuki'],['SUNPHARMA','Sun Pharma'],['TITAN','Titan'],['ASIANPAINT','Asian Paints'],['WIPRO','Wipro'],['ADANIENT','Adani Enterprises'],['TATAMOTORS','Tata Motors'],['ULTRACEMCO','UltraTech Cement'],['NESTLEIND','Nestle India'],['NTPC','NTPC'],['POWERGRID','Power Grid'],['M&M','Mahindra & Mahindra'],['JSWSTEEL','JSW Steel'],['TATASTEEL','Tata Steel'],['HCLTECH','HCL Tech'],['INDUSINDBK','IndusInd Bank'],['DRREDDY','Dr Reddy’s']
].map(([symbol,name])=>({symbol,name,type:'stock'}))
export const funds = [
 'Parag Parikh Flexi Cap Fund','Quant Small Cap Fund','SBI Small Cap Fund','Mirae Asset Large Cap Fund','Axis Bluechip Fund','HDFC Mid-Cap Opportunities Fund','ICICI Prudential Bluechip Fund','Nippon India Small Cap Fund','Kotak Emerging Equity Fund','UTI Nifty 50 Index Fund','Canara Robeco Bluechip Equity Fund','DSP Midcap Fund','Franklin India Prima Fund','Motilal Oswal Nasdaq 100 FOF','Tata Digital India Fund'
].map(name=>({symbol:name.split(' ').slice(0,2).join(' ').toUpperCase(),name,type:'fund'}))

export const demoHoldings = [
 {id:'d1',name:'Reliance Industries',symbol:'RELIANCE',type:'stock',units:24,avg_cost:2445,current_price:2870,buy_date:'2024-04-12'},
 {id:'d2',name:'Tata Consultancy Services',symbol:'TCS',type:'stock',units:12,avg_cost:3612,current_price:3925,buy_date:'2024-07-02'},
 {id:'d3',name:'Parag Parikh Flexi Cap Fund',symbol:'PPFAS',type:'fund',units:835.66,avg_cost:61.4,current_price:76.32,buy_date:'2023-11-16'},
 {id:'d4',name:'UTI Nifty 50 Index Fund',symbol:'UTI NIFTY',type:'fund',units:1014.22,avg_cost:151.84,current_price:174.18,buy_date:'2024-01-08'},
 {id:'d5',name:'HDFC Bank',symbol:'HDFCBANK',type:'stock',units:40,avg_cost:1510,current_price:1634,buy_date:'2025-01-21'}
]

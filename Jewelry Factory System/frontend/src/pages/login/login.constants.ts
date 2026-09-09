export type LoginLanguage = 'TH' | 'EN';

export interface LoginCopy {
  loginTitle: string;
  loginSub: string;
  username: string;
  password: string;
  reqAccessLink: string;
  forgotPwd: string;
  signInBtn: string;
  signingIn: string;
  reqAccessTitle: string;
  reqAccessSub: string;
  fullName: string;
  department: string;
  submitReqBtn: string;
  backToLogin: string;
  errUsername: string;
  errInvalid: string;
  errSys: string;
  reqSent: string;
  adminTitle: string;
  adminInstruction: string;
  adminPassword: string;
  adminInvalid: string;
  cancel: string;
  proceed: string;
  showPassword: string;
  hidePassword: string;
  supportTitle: string;
  supportDescription: string;
  supportOnly: string;
}

export interface RegistrationValues {
  fullName: string;
  username: string;
  password: string;
  department: string;
}

export const BACKGROUND_IMAGES = [
  '/assets/cll_blue_geode.png',
  '/assets/cll_plate.png',
  '/assets/cll_holding_charms.png',
  '/assets/cll_green_geode.png',
  '/assets/cll_hand_ring.png',
  '/assets/cll_ring_earring.png',
  '/assets/cll_box.png',
] as const;

export const EMPTY_REGISTRATION: RegistrationValues = {
  fullName: '',
  username: '',
  password: '',
  department: '',
};

export const LOGIN_COPY: Record<LoginLanguage, LoginCopy> = {
  EN: {
    loginTitle: 'JEWELRY',
    loginSub: 'Sign in to your account',
    username: 'Username',
    password: 'Password',
    reqAccessLink: 'Register Account',
    forgotPwd: 'Forgot Password?',
    signInBtn: 'SIGN IN',
    signingIn: 'SIGNING IN...',
    reqAccessTitle: 'Register New Account',
    reqAccessSub: 'Admin authorization required to create a new user.',
    fullName: 'Full Name',
    department: 'Department',
    submitReqBtn: 'CREATE ACCOUNT',
    backToLogin: 'Back to Login',
    errUsername: 'Please enter Username',
    errInvalid: 'Invalid username or password',
    errSys: 'System error. Please try again.',
    reqSent: 'Registration successful.',
    adminTitle: 'Admin Authorization',
    adminInstruction: 'Please enter the admin password to access registration.',
    adminPassword: 'Admin Password',
    adminInvalid: 'Invalid Admin Password. Access Denied.',
    cancel: 'Cancel',
    proceed: 'Proceed',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    supportTitle: 'Contact IT Support',
    supportDescription: 'For security purposes, all password reset requests must be handled by the team.',
    supportOnly: 'IT Support Only',
  },
  TH: {
    loginTitle: 'ระบบโรงงานเครื่องประดับ',
    loginSub: 'เข้าสู่ระบบบัญชีของคุณ',
    username: 'ชื่อผู้ใช้',
    password: 'รหัสผ่าน',
    reqAccessLink: 'ลงทะเบียนเข้าใช้งาน',
    forgotPwd: 'ลืมรหัสผ่าน?',
    signInBtn: 'เข้าสู่ระบบ',
    signingIn: 'กำลังเข้าสู่ระบบ...',
    reqAccessTitle: 'ลงทะเบียนผู้ใช้ใหม่',
    reqAccessSub: 'สำหรับผู้ดูแลระบบหรือพนักงานที่ได้รับสิทธิ์เท่านั้น',
    fullName: 'ชื่อ - นามสกุล',
    department: 'แผนก / ตำแหน่ง',
    submitReqBtn: 'สร้างบัญชี',
    backToLogin: 'กลับไปหน้าเข้าสู่ระบบ',
    errUsername: 'กรุณากรอกชื่อผู้ใช้',
    errInvalid: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    errSys: 'ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง',
    reqSent: 'สร้างบัญชีเรียบร้อยแล้ว',
    adminTitle: 'ยืนยันสิทธิ์ผู้ดูแลระบบ',
    adminInstruction: 'กรุณากรอกรหัสผ่าน Admin เพื่อเข้าสู่หน้าลงทะเบียน',
    adminPassword: 'รหัสผ่าน Admin',
    adminInvalid: 'รหัสผ่าน Admin ไม่ถูกต้อง',
    cancel: 'ยกเลิก',
    proceed: 'ยืนยัน',
    showPassword: 'แสดงรหัสผ่าน',
    hidePassword: 'ซ่อนรหัสผ่าน',
    supportTitle: 'Contact IT Support',
    supportDescription: 'For security purposes, all password reset requests must be handled by the team.',
    supportOnly: 'IT Support Only',
  },
};

import { createContext, useContext, useState, useEffect } from 'react';

export const translations = {
  en: {
    // Common
    back: 'Back',
    home: 'Home',
    settings: 'Settings',
    videos: 'Videos',
    vocabulary: 'Vocabulary',
    reviews: 'Reviews',
    progress: 'Progress',
    upload: 'Upload Video',
    refresh: 'Refresh',
    save: 'Save',
    submit: 'Submit',
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    pleaseWait: 'Please wait...',
    
    // Home page
    homeTitle: 'Loud Mouth Language Learning',
    homeSubtitle: 'Master languages through immersive video content',
    welcomeMessage: 'Welcome to your language learning journey',
    getStarted: 'Get Started',
    noVideosYet: 'No videos uploaded yet',
    uploadFirstVideo: 'Upload your first video to begin learning',
    
    // Sidebar
    sidebarStats: {
      totalVideos: 'Total Videos',
      totalVocabulary: 'Total Vocabulary',
      dueReviews: 'Due Reviews',
    },
    library: 'Library',
    analytics: 'Analytics',
    
    // Video management
    uploadVideo: 'Upload Video',
    browseVideos: 'Browse Videos',
    viewVocabulary: 'View Vocabulary',
    selectFile: 'Select File',
    uploadProgress: 'Upload Progress',
    uploadComplete: 'Upload Complete',
    uploadFailed: 'Upload Failed',
    fileSelected: 'File Selected',
    dragDropVideo: 'Drag and drop your video file here',
    dragAndDropVideo: "Drag and drop your video here",
    orClickToSelect: "or click to select from your computer",
    supportedFormats: 'Supported formats: MP4, AVI, MOV, WMV',
    maxFileSize: "Maximum file size: 2GB",
    uploading: "Uploading...",
    uploadSuccessful: "Upload Successful!",
    videoProcessed: "Your video has been processed and is ready to use",
    startLearning: "Start Learning",
    
    // Video player
    play: 'Play',
    pause: 'Pause',
    rewind: 'Rewind',
    forward: 'Forward',
    fullscreen: 'Fullscreen',
    subtitles: 'Subtitles',
    speed: 'Speed',
    playVideo: "Play Video",
    pauseVideo: "Pause Video",
    muteVideo: "Mute Video",
    unmuteVideo: "Unmute Video",
    playbackSpeed: "Playback Speed",
    addToVocabulary: "Add to Vocabulary",
    
    // Settings
    settingsSubtitle: 'Customize your learning experience and preferences',
    languagePreferences: 'Language Preferences',
    languageDescription: 'Choose your preferred language for the user interface',
    uiLanguage: 'User Interface Language',
    languageSaved: 'Language preference saved!',
    supportFeedback: 'Support & Feedback',
    supportDescription: 'Get help or share your thoughts about Loud Mouth',
    developerContact: 'Developer Contact',
    githubProfile: 'GitHub Profile',
    emailContact: 'Email Contact',
    
    // Sidebar functionality
    expandSidebar: 'Expand sidebar',
    collapseSidebar: 'Collapse sidebar',
    
    // Authentication
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    email: 'Email',
    enterUsername: 'Enter username',
    enterPassword: 'Enter password',
    enterEmail: 'Enter email address',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    createAccount: 'Create Account',
    welcomeBack: 'Welcome Back',
    signInToContinue: 'Sign in to continue your learning journey',
    signUpToGetStarted: 'Sign up to get started with language learning',
    loginSuccessful: 'Login Successful',
    registrationSuccessful: 'Registration Successful',
    accountCreated: 'Your account has been created successfully',
    loginFailed: 'Login Failed',
    registrationFailed: 'Registration Failed',
    invalidCredentials: 'Invalid username or password',
    registrationError: 'Registration failed. Please try again',
    signingIn: 'Signing in...',
    creatingAccount: 'Creating account...',
    dontHaveAccount: "Don't have an account? Sign up",
    alreadyHaveAccount: 'Already have an account? Sign in',
    demoCredentials: 'Demo Credentials',
    
    // Forgot Password
    forgotPassword: 'Forgot Password',
    forgotPasswordDescription: 'Enter your email address and we\'ll send you a link to reset your password',
    passwordReset: 'Password Reset',
    sendResetLink: 'Send Reset Link',
    sendingReset: 'Sending...',
    backToLogin: 'Back to Login',
    passwordResetSent: 'Password Reset Sent',
    checkEmailForInstructions: 'Check your email for password reset instructions',
    passwordResetFailed: 'Password Reset Failed',
    passwordResetError: 'Failed to send reset email. Please try again',
    enterEmailForReset: 'Enter your email address',
    emailSent: 'Email Sent!',
    passwordResetEmailSent: 'We\'ve sent password reset instructions to your email address',
    didntReceiveEmail: 'Didn\'t receive the email?',
    checkSpamFolder: 'Check your spam or junk folder',
    waitFewMinutes: 'Wait a few minutes and try again',
    tryDifferentEmail: 'Try a different email address',
    sendAnotherEmail: 'Send Another Email',
    demoNotice: 'Demo Notice',
    demoPasswordResetNotice: 'This is a demo app. No actual emails will be sent.',
    
    // Progress
    progressTitle: 'Your Learning Journey',
    progressSubtitle: 'Track your progress and celebrate your achievements',
    weeklyGoal: 'Weekly Learning Goal',
    setGoal: 'Set Goal',
    totalWords: 'Total Words',
    studyTime: 'Study Time',
    dayStreak: 'Day Streak',
    accuracy: 'Accuracy',
    vocabularyGrowth: 'Vocabulary Growth Over Time',
    dailyStudy: 'Daily Study Duration',
    accuracyTrends: 'Review Accuracy Trends',
    hoursThisWeek: 'hours this week',
    setWeeklyGoal: 'Set Weekly Learning Goal',
    chooseHours: 'Choose how many hours you want to study each week.',
    hoursPerWeek: 'Hours per week',
    recommendedHours: 'Recommended: 5-10 hours per week for steady progress',
    overview: 'Overview',
    vocabularyProgress: 'Vocabulary Progress',
    performance: 'Performance',
    
    // Vocabulary Review
    vocabularyReview: 'Vocabulary Review',
    readyToStart: 'Ready to start',
    startReview: 'Start Review',
    showAnswer: 'Show Answer',
    nextWord: 'Next Word',
    correct: 'Correct',
    incorrect: 'Incorrect',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    reviewComplete: 'Review Complete!',
    wordsReviewed: 'Words Reviewed',
    accuracyRate: 'Accuracy Rate',
    timeSpent: 'Time Spent',
    continueReview: 'Continue Review',
    
    // Vocabulary management
    vocabularyList: 'Vocabulary List',
    addWord: 'Add Word',
    searchWords: 'Search words...',
    allWords: 'All Words',
    starredWords: 'Starred Words',
    masteredWords: 'Mastered Words',
    overdueWords: 'Overdue Words',
    wordDetails: 'Word Details',
    translation: 'Translation',
    context: 'Context',
    lastReviewed: 'Last Reviewed',
    nextReview: 'Next Review',
    reviewCount: 'Review Count',
    starred: 'Starred',
    
    // Error pages and messages
    pageNotFound: 'Page Not Found',
    errorOccurred: 'An Error Occurred',
    goBack: 'Go Back',
    tryAgain: 'Try Again',
    somethingWentWrong: 'Something went wrong',
    pleaseRefresh: 'Please refresh the page or try again later',
    returnToHome: "Return to Home",
    returnToPreviousPage: "Return to the previous page",
    exploreVideoLibrary: "Explore your video library",
    checkLearnedWords: "Check your learned words",
    whatWouldYouLikeToDo: "What would you like to do?",
    error: "Error",
    networkError: 'Network Error',
    checkConnection: 'Please check your internet connection',
    
    // Notifications and feedback
    saveSuccessful: 'Saved successfully!',
    deleteSuccessful: 'Deleted successfully!',
    updateSuccessful: 'Updated successfully!',
    operationFailed: 'Operation failed',
    pleaseRetry: 'Please try again',
    confirmDelete: 'Are you sure you want to delete this item?',
    unsavedChanges: 'You have unsaved changes',
    discardChanges: 'Discard changes?',

    // Video upload states
    selectVideoFile: 'Select a video file',
    processingVideo: 'Processing video...',
    extractingSubtitles: 'Extracting subtitles...',
    analyzingContent: 'Analyzing content...',
    readyToWatch: 'Your video is ready to watch',

    // Additional Progress page translations
    wordsLearned: 'Words Learned',
    totalStudyTime: 'Total Study Time',
    vocabularyGrowthOverTime: 'Vocabulary Growth Over Time',
    yourVocabularyExpansionJourney: 'Your vocabulary expansion journey',
    dailyStudyDuration: 'Daily Study Duration',
    timeSpentLearningEachDay: 'Time spent learning each day this week',
    reviewAccuracyTrends: 'Review Accuracy Trends',
    memoryRetentionPerformance: 'Your memory retention performance over time',

    // Vocabulary List
    searchVocabulary: "Search vocabulary...",
    sortBy: "Sort by",
    filterBy: "Filter by",
    dueForReview: "Due for review",
    wordColumn: "Word",
    lastReviewedColumn: "Last Reviewed",
    videoUploadDateColumn: "Video Upload Date",
    noVocabularyFound: "No vocabulary found",
    addVocabularyFromVideos: "Add vocabulary from your videos to start building your collection",
    expandVideo: "Expand video",
    collapseVideo: "Collapse video",
    showMore: "Show more",
    showLess: "Show less",

    // Chart and tooltip translations
    chartTooltips: {
      totalWords: 'Total Words',
      overdueWords: 'Overdue Words',
      studyTime: 'Study Time',
      wordsLearned: 'Words Learned',
      accuracy: 'Accuracy',
      reviewsCount: 'Reviews'
    },

    // Progress summary translations
    goalAchieved: 'Goal Achieved! 🎉',
    hoursRemaining: 'remaining',
    hoursCompleted: 'hours completed',

    // Vocabulary Review additional translations
    reviewDescription: 'You have {count} words to review. Each word will be presented in context with video playback for better understanding.',
    reviewStatistics: 'Review Statistics',
    wordsToReview: 'Words to Review',
    estimatedTime: 'Estimated Time',
    minutes: 'minutes',
    averageAccuracy: 'Average Accuracy',
    beginReview: 'Begin Review',
    reviewSession: 'Review Session',
    typeTranslation: 'Type the translation for:',
    yourAnswer: 'Your answer',
    enterTranslation: 'Enter translation...',
    checkAnswer: 'Check Answer',
    correctAnswerBrief: 'Correct!',
    incorrectAnswer: 'Incorrect',
    correctTranslation: 'Correct translation:',
    playAgain: 'Play Again',
    nextQuestion: 'Next Question',
    reviewCompleted: 'Great job!',
    reviewCompletedMessage: 'You\'ve completed today\'s review!',
    completionMessage: 'Great job! You completed the review session.',
    ok: 'OK',
    finalStats: 'Final Statistics:',
    backToVocabulary: 'Back to Vocabulary',
    continueSession: 'Continue Session',

    // Additional session translations
    voiceInput: 'Voice Input',
    listening: 'Listening...',
    skip: 'Skip',
    correctWellDone: 'Correct! Well done.',
    pleaseEnterAnswer: 'Please enter an answer to continue.',
    incorrectTryAgain: 'Incorrect. Please try again or click \'Show Answer\'.',
    correctAnswer: 'Correct Answer',
    copyAnswerToInput: 'Copy Answer to Input Field',
    practiceTyping: 'Practice typing or speaking the correct answer',
    submitAnswer: 'Submit Answer',
    typeEnglishSentence: 'Type the English sentence you heard...',
    markAsKnown: 'Mark as Known'
  },
  zh: {
    // Common
    back: '返回',
    home: '主页',
    settings: '设置',
    videos: '视频',
    vocabulary: '词汇',
    reviews: '复习',
    progress: '进度',
    upload: '上传视频',
    refresh: '刷新',
    save: '保存',
    submit: '提交',
    cancel: '取消',
    close: '关闭',
    delete: '删除',
    edit: '编辑',
    loading: '加载中...',
    pleaseWait: '请稍候...',
    
    // Home page
    homeTitle: 'Loud Mouth 语言学习',
    homeSubtitle: '通过沉浸式视频内容掌握语言',
    welcomeMessage: '欢迎来到您的语言学习之旅',
    getStarted: '开始学习',
    noVideosYet: '尚未上传视频',
    uploadFirstVideo: '上传您的第一个视频开始学习',
    
    // Sidebar
    sidebarStats: {
      totalVideos: '总视频数',
      totalVocabulary: '总词汇量',
      dueReviews: '待复习',
    },
    library: '媒体库',
    analytics: '分析',
    
    // Video management
    uploadVideo: '上传视频',
    browseVideos: '浏览视频',
    viewVocabulary: '查看词汇',
    selectFile: '选择文件',
    uploadProgress: '上传进度',
    uploadComplete: '上传完成',
    uploadFailed: '上传失败',
    fileSelected: '已选择文件',
    dragDropVideo: '将视频文件拖拽到此处',
    supportedFormats: '支持的格式：MP4、AVI、MOV',
    
    // Video player
    play: '播放',
    pause: '暂停',
    rewind: '后退',
    forward: '前进',
    fullscreen: '全屏',
    subtitles: '字幕',
    speed: '速度',
    
    // Settings
    settingsSubtitle: '自定义您的学习体验和偏好',
    languagePreferences: '语言偏好',
    languageDescription: '选择您的用户界面首选语言',
    uiLanguage: '用户界面语言',
    languageSaved: '语言偏好已保存！',
    supportFeedback: '支持与反馈',
    supportDescription: '获取帮助或分享您对 Loud Mouth 的想法',
    developerContact: '开发者联系方式',
    githubProfile: 'GitHub 主页',
    emailContact: '邮件联系',
    
    // Sidebar functionality
    expandSidebar: '展开侧边栏',
    collapseSidebar: '收起侧边栏',
    
    // Authentication
    login: '登录',
    register: '注册',
    logout: '退出登录',
    username: '用户名',
    password: '密码',
    email: '邮箱',
    enterUsername: '请输入用户名',
    enterPassword: '请输入密码',
    enterEmail: '请输入邮箱地址',
    signIn: '登录',
    signUp: '注册',
    createAccount: '创建账户',
    welcomeBack: '欢迎回来',
    signInToContinue: '登录以继续您的学习旅程',
    signUpToGetStarted: '注册开始您的语言学习之旅',
    loginSuccessful: '登录成功',
    registrationSuccessful: '注册成功',
    accountCreated: '您的账户已成功创建',
    loginFailed: '登录失败',
    registrationFailed: '注册失败',
    invalidCredentials: '用户名或密码错误',
    registrationError: '注册失败，请重试',
    signingIn: '正在登录...',
    creatingAccount: '正在创建账户...',
    dontHaveAccount: '没有账户？立即注册',
    alreadyHaveAccount: '已有账户？立即登录',
    demoCredentials: '演示账户',
    
    // Forgot Password
    forgotPassword: '忘记密码',
    forgotPasswordDescription: '输入您的邮箱地址，我们将发送重置密码的链接',
    passwordReset: '密码重置',
    sendResetLink: '发送重置链接',
    sendingReset: '发送中...',
    backToLogin: '返回登录',
    passwordResetSent: '密码重置邮件已发送',
    checkEmailForInstructions: '请查看您的邮箱以获取密码重置说明',
    passwordResetFailed: '密码重置失败',
    passwordResetError: '发送重置邮件失败，请重试',
    enterEmailForReset: '请输入您的邮箱地址',
    emailSent: '邮件已发送！',
    passwordResetEmailSent: '我们已将密码重置说明发送到您的邮箱',
    didntReceiveEmail: '没有收到邮件？',
    checkSpamFolder: '检查您的垃圾邮件文件夹',
    waitFewMinutes: '等待几分钟后重试',
    tryDifferentEmail: '尝试不同的邮箱地址',
    sendAnotherEmail: '重新发送邮件',
    demoNotice: '演示提示',
    demoPasswordResetNotice: '这是演示应用，不会发送真实邮件。',
    
    // Progress
    progressTitle: '您的学习历程',
    progressSubtitle: '跟踪您的进度并庆祝您的成就',
    weeklyGoal: '每周学习目标',
    setGoal: '设置目标',
    totalWords: '总词汇',
    studyTime: '学习时间',
    dayStreak: '连续天数',
    accuracy: '准确率',
    vocabularyGrowth: '词汇增长趋势',
    dailyStudy: '每日学习时长',
    accuracyTrends: '复习准确率趋势',
    hoursThisWeek: '本周小时数',
    setWeeklyGoal: '设置每周学习目标',
    chooseHours: '选择您每周要学习的小时数。',
    hoursPerWeek: '每周小时数',
    recommendedHours: '建议：每周5-10小时稳步进步',
    overview: '概览',
    vocabularyProgress: '词汇进度',
    performance: '表现',
    
    // Vocabulary Review
    vocabularyReview: '词汇复习',
    readyToStart: '准备开始',
    startReview: '开始复习',
    showAnswer: '显示答案',
    nextWord: '下一个单词',
    correct: '正确',
    incorrect: '错误',
    easy: '简单',
    medium: '中等',
    hard: '困难',
    reviewComplete: '复习完成！',
    wordsReviewed: '已复习单词',
    accuracyRate: '准确率',
    timeSpent: '用时',
    continueReview: '继续复习',
    
    // Vocabulary management
    vocabularyList: '词汇列表',
    addWord: '添加单词',
    searchWords: '搜索单词...',
    filterByDifficulty: '按难度筛选',
    allWords: '所有单词',
    starredWords: '已收藏单词',
    masteredWords: '已掌握单词',
    overdueWords: '逾期单词',
    wordDetails: '单词详情',
    translation: '翻译',
    context: '语境',
    difficulty: '难度',
    lastReviewed: '上次复习',
    nextReview: '下次复习',
    reviewCount: '复习次数',
    starred: '已收藏',
    
    // Error pages and messages
    pageNotFound: '页面未找到',
    errorOccurred: '发生错误',
    goBack: '返回',
    tryAgain: '重试',
    somethingWentWrong: '出现问题',
    pleaseRefresh: '请刷新页面并重试',
    networkError: '网络错误',
    checkConnection: '请检查您的网络连接',
    
    // Notifications and feedback
    saveSuccessful: '保存成功！',
    deleteSuccessful: '删除成功！',
    updateSuccessful: '更新成功！',
    operationFailed: '操作失败',
    pleaseRetry: '请重试',
    confirmDelete: '确定要删除此项目吗？',
    unsavedChanges: '您有未保存的更改',
    discardChanges: '丢弃更改？',
    
    // Error pages
    returnToHome: "返回主页",
    returnToPreviousPage: "返回上一页",
    exploreVideoLibrary: "探索您的视频库",
    checkLearnedWords: "查看已学单词",
    whatWouldYouLikeToDo: "您想要做什么？",
    error: "错误",

    // Upload Form
    dragAndDropVideo: "将视频拖放到这里",
    orClickToSelect: "或点击从计算机选择",
    maxFileSize: "最大文件大小：2GB",
    uploading: "上传中...",
    videoProcessed: "您的视频已处理完成并可以使用",
    startLearning: "开始学习",

    // Video Player
    playVideo: "播放视频",
    pauseVideo: "暂停视频",
    muteVideo: "静音视频",
    unmuteVideo: "取消静音",
    playbackSpeed: "播放速度",
    addToVocabulary: "添加到词汇表",

    // Vocabulary List
    searchVocabulary: "搜索词汇...",
    sortBy: "排序方式",
    filterBy: "筛选",
    dueForReview: "待复习",
    wordColumn: "单词",
    lastReviewedColumn: "上次复习",
    videoUploadDateColumn: "视频上传时间",
    noVocabularyFound: "未找到词汇",
    addVocabularyFromVideos: "从您的视频中添加词汇以开始构建您的集合",
    expandVideo: "展开视频",
    collapseVideo: "收起视频",

    // Video upload states
    selectVideoFile: '选择视频文件',
    processingVideo: '正在处理视频...',
    extractingSubtitles: '正在提取字幕...',
    analyzingContent: '正在分析内容...',
    uploadSuccessful: '视频上传成功！',
    readyToWatch: '您的视频已准备好观看',

    // Additional Progress page translations
    wordsLearned: '已学单词',
    totalStudyTime: '总学习时间',
    vocabularyGrowthOverTime: '词汇增长趋势',
    yourVocabularyExpansionJourney: '您的词汇扩展历程',
    dailyStudyDuration: '每日学习时长',
    timeSpentLearningEachDay: '每天学习时间',
    reviewAccuracyTrends: '复习准确率趋势',
    memoryRetentionPerformance: '记忆保持表现随时间变化',

    // Chart and tooltip translations
    chartTooltips: {
      totalWords: '总单词',
      overdueWords: '逾期单词',
      studyTime: '学习时间',
      wordsLearned: '已学单词',
      accuracy: '准确率',
      reviewsCount: '复习次数'
    },

    // Progress summary translations
    goalAchieved: '目标达成！🎉',
    hoursRemaining: '剩余',
    hoursCompleted: '小时已完成',

    // Vocabulary Review additional translations
    reviewDescription: '您有 {count} 个单词需要复习。每个单词都会在语境中呈现，并配有视频播放以便更好理解。',
    reviewStatistics: '复习统计',
    wordsToReview: '待复习单词',
    estimatedTime: '预计时间',
    minutes: '分钟',
    averageAccuracy: '平均准确率',
    beginReview: '开始复习',
    reviewSession: '复习会话',
    typeTranslation: '输入以下内容的翻译：',
    yourAnswer: '您的答案',
    enterTranslation: '输入翻译...',
    checkAnswer: '检查答案',
    correctAnswerBrief: '正确！',
    incorrectAnswer: '错误',
    correctTranslation: '正确翻译：',
    playAgain: '重播',
    nextQuestion: '下一题',
    reviewCompleted: '太棒了！',
    reviewCompletedMessage: '您已完成今天的复习！',
    completionMessage: '做得很好！您已完成复习。',
    ok: '确定',
    finalStats: '最终统计：',
    backToVocabulary: '返回词汇',
    continueSession: '继续会话',

    // Additional session translations
    voiceInput: '语音输入',
    listening: '正在聆听...',
    skip: '跳过',
    correctWellDone: '正确！做得很好。',
    pleaseEnterAnswer: '请输入答案以继续。',
    incorrectTryAgain: '错误。请重试或点击"显示答案"。',
    correctAnswerFull: '正确答案',
    copyAnswerToInput: '将答案复制到输入框',
    practiceTyping: '练习输入或说出正确答案',
    submitAnswer: '提交答案',
    typeEnglishSentence: '输入您听到的英语句子...',
    markAsKnown: '标记为已知'
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  // Add effect to force re-render when language changes
  const [, forceRender] = useState({});
  
  useEffect(() => {
    const handleLanguageChange = () => {
      console.log('Language change event received, forcing re-render');
      forceRender({});
    };
    
    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);
  
  return context;
}

export function getNestedTranslation(obj: any, path: string): string {
  if (!path || typeof path !== 'string') {
    console.error('Invalid translation path:', path);
    return '';
  }
  
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj) || path;
  } catch (error) {
    console.error('Error getting translation:', error, 'path:', path);
    return path || '';
  }
}
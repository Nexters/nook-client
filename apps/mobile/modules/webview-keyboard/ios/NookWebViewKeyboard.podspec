Pod::Spec.new do |s|
  s.name = 'NookWebViewKeyboard'
  s.version = '0.1.0'
  s.summary = 'Removes the WKWebView keyboard accessory bar'
  s.description = 'Removes the WKWebView keyboard accessory bar'
  s.license = { :type => 'MIT' }
  s.author = 'nook'
  s.homepage = 'https://nook.today'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end

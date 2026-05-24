#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BlackpineWidget, NSObject)

RCT_EXTERN_METHOD(updateData:(NSString *)json)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end

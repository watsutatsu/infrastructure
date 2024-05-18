import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as iam from '@aws-cdk/aws-iam';

export class MyCdkAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the S3 bucket
    const bucket = new s3.Bucket(this, 'MyBucket', {
      lifecycleRules: [
        {
          id: 'MoveToGlacier',
          transitions: [
            { storageClass: s3.StorageClass.GLACIER, transitionAfter: cdk.Duration.days(30) },
          ],
          expiration: cdk.Duration.days(365),
        },
      ],
    });

    // Define the bucket access policy
    const bucketPolicy = new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${bucket.bucketArn}/public/*`],
      principals: [new iam.AnyPrincipal()],
    });
    bucket.addToResourcePolicy(bucketPolicy);

    // Create a CloudFront distribution
    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'MyDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
          },
          behaviors: [{ isDefaultBehavior: true, pathPattern: '/public/*' }],
        },
      ],
    });

    // Deploy sample files to the bucket
    new s3deploy.BucketDeployment(this, 'DeployFiles', {
      sources: [s3deploy.Source.asset('./public')],
      destinationBucket: bucket,
      destinationKeyPrefix: 'public', // Optional: place files under public/
      distribution,
      distributionPaths: ['/public/*'],
    });

    new cdk.CfnOutput(this, 'BucketURL', {
      value: bucket.bucketWebsiteUrl,
      description: 'URL of the bucket website',
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'Domain name of the CloudFront distribution',
    });
  }
}


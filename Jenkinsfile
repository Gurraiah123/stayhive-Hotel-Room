pipeline {
    agent any

    environment {
        DOCKERHUB_USER = "guru0114"
        BACKEND_IMAGE = "guru0114/stayhive-backend"
        FRONTEND_IMAGE = "guru0114/stayhive-frontend"
        IMAGE_TAG = "${BUILD_NUMBER}"

        AWS_REGION = "ap-south-2"
        EKS_CLUSTER = "stayhive-cluster"
    }

    stages {

        stage('Checkout Code') {
            steps {
                git branch: 'main',
                url: 'https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git'
            }
        }

        stage('Build Backend Image') {
            steps {
                dir('backend') {
                    sh '''
                    docker build -t $BACKEND_IMAGE:$IMAGE_TAG .
                    docker tag $BACKEND_IMAGE:$IMAGE_TAG $BACKEND_IMAGE:latest
                    '''
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                dir('frontend') {
                    sh '''
                    docker build -t $FRONTEND_IMAGE:$IMAGE_TAG .
                    docker tag $FRONTEND_IMAGE:$IMAGE_TAG $FRONTEND_IMAGE:latest
                    '''
                }
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {

                    sh '''
                    echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                    '''
                }
            }
        }

        stage('Push Backend Image') {
            steps {
                sh '''
                docker push $BACKEND_IMAGE:$IMAGE_TAG
                docker push $BACKEND_IMAGE:latest
                '''
            }
        }

        stage('Push Frontend Image') {
            steps {
                sh '''
                docker push $FRONTEND_IMAGE:$IMAGE_TAG
                docker push $FRONTEND_IMAGE:latest
                '''
            }
        }

        stage('Configure EKS') {
            steps {
                sh '''
                aws eks update-kubeconfig \
                --region $AWS_REGION \
                --name $EKS_CLUSTER
                '''
            }
        }

        stage('Deploy Backend') {
            steps {
                sh '''
                kubectl apply -f k8s/backend-deployment.yaml
                kubectl apply -f k8s/backend-service.yaml
                '''
            }
        }

        stage('Deploy Frontend') {
            steps {
                sh '''
                kubectl apply -f k8s/frontend-deployment.yaml
                kubectl apply -f k8s/frontend-service.yaml
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                kubectl get deployments
                kubectl get pods
                kubectl get services
                '''
            }
        }
    }

    post {

        success {
            echo "Application deployed successfully to Amazon EKS."
        }

        failure {
            echo "Deployment failed."
        }

        always {
            sh 'docker image prune -f'
        }
    }
}
